package ru.neochoice.bbsflash;

import android.app.*;
import android.content.*;
import android.hardware.usb.*;
import android.net.Uri;
import android.os.*;
import android.util.Base64;
import android.view.*;
import android.webkit.*;
import android.widget.FrameLayout;
import androidx.core.content.ContextCompat;
import androidx.webkit.*;
import com.hoho.android.usbserial.driver.*;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

/** Offline WebView UI. Optional native diagnostics upload; no remote WebView content. */
public final class MainActivity extends Activity {
    private static final String ORIGIN="https://appassets.androidplatform.net";
    private static final String HOME=ORIGIN+"/assets/site/bbs-flash.html";
    private static final int IMPORT=41, EXPORT=42;
    private final Handler main=new Handler(Looper.getMainLooper());
    private final ExecutorService commands=Executors.newSingleThreadExecutor();
    private final ExecutorService files=Executors.newSingleThreadExecutor();
    private final ExecutorService diagnostics=Executors.newSingleThreadExecutor();
    private final ExecutorService uploader=Executors.newSingleThreadExecutor();
    private volatile ConnectionJournal journal;
    private volatile String journalError="", historyId;
    private volatile boolean transactionBusy, syncing;
    private SharedPreferences diagnosticsPrefs;
    private interface JournalAction {void run(ConnectionJournal journal) throws Exception;}
    private void journal(JournalAction action){diagnostics.execute(()->{try{if(journal!=null)action.run(journal);}catch(Exception e){journalError="История недоступна. Экспортируй журнал UART отдельно.";}});}
    private WebView web;
    private UsbManager manager;
    private JavaScriptReplyProxy reply;
    private volatile UsbSerialPort port;
    private volatile String token;
    private UsbSerialPort selected;
    private UsbDevice permissionDevice;
    private String chooseId, saveId;
    private byte[] saveBytes;
    private AlertDialog chooser;
    private ValueCallback<Uri[]> fileCallback;
    private boolean registered, destroyed;
    private volatile boolean foreground;
    private String permissionAction;

    private final BroadcastReceiver receiver=new BroadcastReceiver() {
        @Override public void onReceive(Context context,Intent intent) {
            UsbDevice device=intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
            if (permissionAction.equals(intent.getAction())) {
                if (permissionDevice==null || device==null || device.getDeviceId()!=permissionDevice.getDeviceId()) return;
                permissionDevice=null;
                if (!manager.hasPermission(device)) cancelChoice("Android не разрешил доступ к USB");
                else finishChoice();
            } else if (UsbManager.ACTION_USB_DEVICE_DETACHED.equals(intent.getAction())) {
                UsbSerialPort current=selected;
                if (device!=null && current!=null && device.getDeviceId()==current.getDriver().getDevice().getDeviceId()) {
                    cancelChoice("Кабель отключён");disconnect("Кабель отключён");
                }
            }
        }
    };

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        manager=(UsbManager)getSystemService(USB_SERVICE);
        diagnosticsPrefs=getSharedPreferences("diagnostics-v1",MODE_PRIVATE);
        diagnostics.execute(()->{try{journal=new ConnectionJournal(this);}catch(Exception e){journalError="Историю не удалось открыть. Данные сохранены для восстановления.";}});
        permissionAction=getPackageName()+".USB_PERMISSION";
        IntentFilter filter=new IntentFilter(permissionAction);
        filter.addAction(UsbManager.ACTION_USB_DEVICE_DETACHED);
        ContextCompat.registerReceiver(this,receiver,filter,ContextCompat.RECEIVER_NOT_EXPORTED);
        registered=true;
        web=new WebView(this);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        FrameLayout container=new FrameLayout(this);
        container.setBackgroundColor(0xffe8e8ed);
        container.addView(web,new FrameLayout.LayoutParams(-1,-1));
        setContentView(container);
        if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::confirmExit);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        // Android 15 edge-to-edge: keep controls outside status/navigation bars.
        container.setOnApplyWindowInsetsListener((view,insets)->{
            view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets;
        });
        WebSettings settings=web.getSettings();
        settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        WebViewAssetLoader loader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request) {
                Uri u=request.getUrl();
                if (local(u)) {
                    WebResourceResponse result=loader.shouldInterceptRequest(u);
                    if (result!=null) return result;
                }
                return new WebResourceResponse("text/plain","UTF-8",403,"Blocked",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request) {
                if(transactionBusy)return true;
                Uri u=request.getUrl();
                if (local(u) && (u.getPath().endsWith("bbs-flash.html") || u.getPath().endsWith("index.html"))) return false;
                if (request.isForMainFrame() && request.hasGesture() && ("https".equals(u.getScheme()) || "mailto".equals(u.getScheme()))) {
                    disconnect("Открыта внешняя ссылка. Подключись заново.");
                    try {startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(ActivityNotFoundException ignored){}
                }
                return true;
            }
            @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap favicon) {
                cancelChoice("Страница перезагружена");disconnect("Страница перезагружена");reply=null;setTransactionBusy(false);
            }
            @Override public boolean onRenderProcessGone(WebView view,RenderProcessGoneDetail detail) {
                disconnect("WebView остановлен");finish();return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params) {
                if(transactionBusy){callback.onReceiveValue(null);return true;}
                if(fileCallback!=null)fileCallback.onReceiveValue(null);
                fileCallback=callback;
                Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                try {startActivityForResult(intent,IMPORT);} catch(ActivityNotFoundException e){fileCallback.onReceiveValue(null);fileCallback=null;}
                return true;
            }
        });
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            new AlertDialog.Builder(this).setTitle("Обнови Android System WebView").setMessage("Для USB нужен актуальный Android System WebView или Chrome. После обновления открой приложение заново.").setPositiveButton("Закрыть",(d,w)->finish()).setCancelable(false).show();return;
        }
        WebViewCompat.addWebMessageListener(web,"BBSAndroid",Set.of(ORIGIN),(view,message,origin,isMainFrame,proxy)->{
            if (!isMainFrame || !ORIGIN.equals(origin.toString()))return;
            reply=proxy;
            String data=message.getData();
            if(data==null || data.length()>6*1024*1024)return;
            try {handle(new JSONObject(data));} catch(Exception e){/* Invalid messages never reach USB. */}
        });
        web.loadUrl(HOME);
    }
    private static boolean local(Uri u) {
        return "https".equals(u.getScheme()) && "appassets.androidplatform.net".equals(u.getHost()) && u.getPort()==-1 && u.getPath()!=null && u.getPath().startsWith("/assets/site/");
    }
    private void send(JSONObject result) {
        JavaScriptReplyProxy destination=reply;
        main.post(()->{if(!destroyed && destination!=null && destination==reply) destination.postMessage(result.toString());});
    }
    private void result(String id,Object value,String error) {
        try {JSONObject m=new JSONObject().put("id",id);if(error!=null)m.put("error",error);else m.put("result",value==null?JSONObject.NULL:value);send(m);}catch(JSONException ignored){}
    }
    private void event(String event,String session,Object bytes,String error) {
        try {JSONObject m=new JSONObject().put("event",event).put("token",session);if(bytes!=null)m.put("bytes",bytes);if(error!=null)m.put("error",error);send(m);}catch(JSONException ignored){}
    }
    private void handle(JSONObject request) throws JSONException {
        String id=request.getString("id"),op=request.getString("op");
        if(id.length()>100)return;
        switch(op){
            case "busy": setTransactionBusy(request.optBoolean("value"));result(id,null,null);break;
            case "compatibility": {
                android.content.pm.PackageInfo provider=WebView.getCurrentWebViewPackage();
                JSONObject info=new JSONObject().put("appVersion",BuildConfig.VERSION_NAME).put("androidApi",Build.VERSION.SDK_INT)
                    .put("usbHost",getPackageManager().hasSystemFeature(android.content.pm.PackageManager.FEATURE_USB_HOST))
                    .put("webView",provider==null?"Не определён":provider.versionName)
                    .put("usbDevices",manager.getDeviceList().size()).put("uploadEnabled",BuildConfig.DIAGNOSTICS_UPLOAD);
                result(id,info,null);break;
            }
            case "record": {
                String history=request.optString("historyId"),kind=request.optString("kind");
                if(history.equals(historyId) && kind.matches("connected|readDone|written|noChanges|cancelled|partial|CHECKSUM|VERIFY|TIMEOUT|DISCONNECTED|STORAGE|DEVICE|UNSTABLE_READ|UNEXPECTED_BLOCK|FRAME|WRITE_IO|invalid"))journal(j->j.add(history,kind,"",0));
                result(id,null,null);break;
            }
            case "history": diagnostics.execute(()->{try{result(id,new JSONObject().put("sessions",journal==null?new JSONArray():journal.list()).put("error",journalError).put("endpoint",diagnosticsPrefs.getString("endpoint","")).put("configured",!diagnosticsPrefs.getString("access","").isEmpty()).put("consent",diagnosticsPrefs.getBoolean("consent",false)),null);}catch(Exception e){result(id,null,"Ошибка истории");}});break;
            case "historyClear":
                if(transactionBusy||token!=null||syncing){result(id,null,"Сначала отключись от мотора и дождись отправки отчётов");return;}
                diagnostics.execute(()->{try{if(journal!=null)journal.clear();result(id,null,null);}catch(Exception e){result(id,null,"Не удалось очистить историю");}});break;
            case "diagnosticsConfig":
                if(request.optBoolean("consent")){result(id,null,"Отправка недоступна в этой версии. История сохраняется только на телефоне.");return;}
                if(transactionBusy||(syncing&&request.optBoolean("consent"))){result(id,null,"Дождись завершения операции");return;}
                try {
                    boolean consent=request.optBoolean("consent");String endpoint=request.optString("endpoint").trim(),access=request.optString("access").trim();
                    if(!endpoint.isEmpty())endpoint=DiagnosticsUpload.endpoint(endpoint);
                    if(!endpoint.equals(diagnosticsPrefs.getString("endpoint","")) && access.isEmpty() && consent)throw new IOException("Для нового сервера нужен код доступа");
                    if(!access.isEmpty()&&!access.matches("[A-Za-z0-9_-]{32,128}"))throw new IOException("Некорректный код доступа к диагностике");
                    if(access.isEmpty())access=diagnosticsPrefs.getString("access","");
                    if(consent&&(endpoint.isEmpty()||access.isEmpty()))throw new IOException("Укажи адрес сервера и код доступа. Это не токен Telegram-бота.");
                    diagnosticsPrefs.edit().putString("endpoint",endpoint).putString("access",access).putBoolean("consent",consent).apply();result(id,null,null);
                }catch(Exception e){result(id,null,e.getMessage());}break;
            case "diagnosticsSend": syncDiagnostics(id);break;
            case "choose": choose(id);break;
            case "close":
                if(!request.has("token") || Objects.equals(token,request.optString("token"))) {
                    cancelChoice("Подключение отменено");disconnect("Соединение закрыто");
                }
                result(id,null,null);break;
            case "open": case "write":
                String session=request.optString("token");
                String record=historyId;
                if(token==null || !token.equals(session)){result(id,null,"Подключись заново");return;}
                commands.execute(()->{
                    try {
                        if(!foreground || !session.equals(token))throw new IOException("Сеанс закрыт");
                        if(op.equals("open"))open(session);
                        else {
                            byte[] bytes=BridgePolicy.bytes(request.getJSONArray("bytes"));
                            UsbSerialPort current=port;
                            if(current==null || !session.equals(token))throw new IOException("USB отключён");
                            current.write(bytes,2000);
                            if(bytes.length>1)journal(j->j.add(record,bytes[0]==22?"write_command":"read_command","",bytes[1]&255));
                        }
                        if(!session.equals(token))throw new IOException("Сеанс закрыт");
                        result(id,null,null);
                    } catch(Exception e){journal(j->j.add(record,"usb_error","IO",0));result(id,null,"Ошибка USB: "+e.getMessage());disconnect("USB: "+e.getMessage(),session);}
                });break;
            case "save": save(id,request);break;
            default:result(id,null,"Неизвестная команда");
        }
    }
    private void choose(String id) {
        if(token!=null || chooseId!=null){result(id,null,"Сначала отключи текущий кабель");return;}
        if(!getPackageManager().hasSystemFeature(android.content.pm.PackageManager.FEATURE_USB_HOST)){result(id,null,"Этот телефон не сообщает о поддержке USB Host/OTG. Подключение кабеля недоступно.");return;}
        historyId=UUID.randomUUID().toString();String record=historyId;journal(j->j.start(record));
        List<UsbSerialPort> ports=new ArrayList<>();List<String> names=new ArrayList<>();
        for(UsbSerialDriver driver:UsbSerialProber.getDefaultProber().findAllDrivers(manager)) {
            UsbDevice d=driver.getDevice();
            for(UsbSerialPort p:driver.getPorts()) {ports.add(p);names.add(driver.getClass().getSimpleName().replace("SerialDriver","")+String.format(Locale.ROOT," · %04X:%04X · порт %d",d.getVendorId(),d.getProductId(),p.getPortNumber()+1));}
        }
        if(ports.isEmpty()) {journal(j->{j.add(record,"not_found","",0);j.end(record,"not_found");});result(id,null,manager.getDeviceList().isEmpty()?"USB-устройства не видны. Проверь OTG, переходник и кабель с передачей данных. На iQOO, vivo, OPPO и OnePlus может потребоваться включить OTG в настройках.":"USB-устройство видно, но совместимый UART-адаптер не найден. Поддерживаются FTDI, CP210x, CH34x, PL2303 и CDC. Не каждый USB-кабель подходит для Bafang.");return;}
        chooseId=id;
        chooser=new AlertDialog.Builder(this).setTitle("Выбери кабель Bafang").setItems(names.toArray(new String[0]),(dialog,which)->{
            selected=ports.get(which);UsbDevice device=selected.getDriver().getDevice();
            String driver=selected.getDriver().getClass().getSimpleName();journal(j->j.usb(record,device.getVendorId(),device.getProductId(),driver));
            if(manager.hasPermission(device)){finishChoice();return;}
            permissionDevice=device;
            Intent intent=new Intent(permissionAction).setPackage(getPackageName());
            PendingIntent permission=PendingIntent.getBroadcast(this,0,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_MUTABLE);
            manager.requestPermission(device,permission);
        }).setNegativeButton("Отмена",(d,w)->cancelChoice("Выбор отменён")).setOnCancelListener(d->cancelChoice("Выбор отменён")).show();
    }
    private void finishChoice() {
        if(chooseId==null || selected==null)return;
        if(!foreground){cancelChoice("Приложение свёрнуто. Подключись заново.");return;}
        token=UUID.randomUUID().toString();UsbDevice d=selected.getDriver().getDevice();
        try {result(chooseId,new JSONObject().put("token",token).put("historyId",historyId).put("vendorId",d.getVendorId()).put("productId",d.getProductId()).put("driver",selected.getDriver().getClass().getSimpleName()).put("androidApi",Build.VERSION.SDK_INT).put("appVersion",BuildConfig.VERSION_NAME).put("readMode","UsbRequest; protocol timeout 5000ms; 1200 8N1"),null);}catch(JSONException ignored){}
        chooseId=null;permissionDevice=null;
    }
    private void cancelChoice(String reason) {
        if(chooseId!=null){String record=historyId;journal(j->{j.add(record,"permission_or_selection_cancelled","",0);j.end(record,"cancelled");});result(chooseId,null,reason);chooseId=null;}
        permissionDevice=null;
        if(chooser!=null){chooser.dismiss();chooser=null;}
    }
    private void open(String session) throws IOException {
        UsbSerialPort current=selected;
        if(port!=null || current==null)throw new IOException("Порт недоступен");
        UsbDeviceConnection connection=manager.openDevice(current.getDriver().getDevice());
        if(connection==null)throw new IOException("Нет разрешения Android на USB");
        final int packetSize;
        try {
            current.open(connection);
            current.setParameters(1200,8,UsbSerialPort.STOPBITS_1,UsbSerialPort.PARITY_NONE);
            current.setFlowControl(UsbSerialPort.FlowControl.NONE);
            UsbEndpoint endpoint=current.getReadEndpoint();
            if(endpoint==null || endpoint.getMaxPacketSize()<1 || endpoint.getMaxPacketSize()>16384)throw new IOException("Некорректный USB endpoint чтения");
            packetSize=endpoint.getMaxPacketSize();
            synchronized(this){if(!session.equals(token))throw new IOException("Сеанс закрыт");port=current;}
        }catch(Exception e){try{current.close();}catch(Exception ignored){}connection.close();throw new IOException(e.getMessage(),e);}
        main.post(()->{if(session.equals(token))getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);});
        Thread reader=new Thread(()->{
            // Packet-sized reads avoid driver-specific aggregation. Timeout 0 uses
            // UsbRequest/requestWait in usb-serial-for-android; close() cancels it.
            // The protocol layer still bounds every request to 5 seconds.
            byte[] buffer=new byte[packetSize];
            try {
                while(session.equals(token)){
                    int count=current.read(buffer,0);
                    if(count>0 && session.equals(token)) {
                        for(int offset=0;offset<count;offset+=512){
                            JSONArray bytes=new JSONArray();for(int i=offset;i<Math.min(count,offset+512);i++)bytes.put(buffer[i]&255);
                            event("data",session,bytes,null);
                        }
                    }
                }
            }catch(Exception e){disconnect("Кабель отключён или USB недоступен",session);}
        },"BBS-USB-read");reader.start();
    }
    private void disconnect(String reason) {
        disconnect(reason,null);
    }
    private void disconnect(String reason,String expectedToken) {
        final UsbSerialPort previous;final String previousToken;
        synchronized(this){if(expectedToken!=null&&!expectedToken.equals(token))return;previous=port;previousToken=token;port=null;token=null;}
        if(previousToken!=null){String record=historyId;journal(j->j.end(record,foreground?"closed":"background"));event("disconnected",previousToken,null,reason);main.postDelayed(()->{if(foreground&&!transactionBusy&&token==null)syncDiagnostics(null);},5000);}
        if(previous!=null)commands.execute(()->{try{previous.close();}catch(Exception ignored){}});
        main.post(()->getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON));
    }
    private void save(String id,JSONObject request) {
        if(transactionBusy){result(id,null,"Дождись завершения чтения или записи");return;}
        if(saveId!=null){result(id,null,"Дождись сохранения предыдущего файла");return;}
        try {
            byte[] data=Base64.decode(request.getString("data"),Base64.DEFAULT);
            if(data.length>4*1024*1024)throw new IOException("Файл больше 4 МБ");
            saveBytes=data;saveId=id;
            String name=request.optString("name","bbs-backup.el").replaceAll("[^\\p{L}\\p{N}._ -]","_");
            if(name.length()>100)name=name.substring(0,100);
            Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/octet-stream").putExtra(Intent.EXTRA_TITLE,name);
            startActivityForResult(intent,EXPORT);
        }catch(Exception e){saveBytes=null;saveId=null;result(id,null,"Не удалось открыть сохранение: "+e.getMessage());}
    }
    @Override protected void onActivityResult(int code,int status,Intent data) {
        super.onActivityResult(code,status,data);
        if(code==IMPORT && fileCallback!=null){fileCallback.onReceiveValue(status==RESULT_OK && data!=null && data.getData()!=null?new Uri[]{data.getData()}:null);fileCallback=null;}
        if(code==EXPORT && saveId!=null){
            String id=saveId;byte[] bytes=saveBytes;saveId=null;saveBytes=null;
            if(status!=RESULT_OK || data==null || data.getData()==null){result(id,null,"Сохранение отменено");return;}
            Uri uri=data.getData();
            files.execute(()->{try(OutputStream out=getContentResolver().openOutputStream(uri,"wt")){if(out==null)throw new IOException("Файл недоступен");out.write(bytes);out.flush();result(id,null,null);}catch(Exception e){result(id,null,"Ошибка сохранения: "+e.getMessage());}});
        }
    }
    private void syncDiagnostics(String id) {
        if(!BuildConfig.DIAGNOSTICS_UPLOAD){if(id!=null)result(id,null,"Отправка пока недоступна. История сохранена на телефоне.");return;}
        if(transactionBusy||token!=null||syncing){if(id!=null)result(id,null,"Сначала отключись от мотора и дождись завершения операций");return;}
        if(!diagnosticsPrefs.getBoolean("consent",false)){if(id!=null)result(id,null,"Передача диагностики выключена");return;}
        syncing=true;
        diagnostics.execute(()->uploader.execute(()->{
            int sent=0;
            try {
                if(journal==null)throw new IOException("История недоступна");
                JSONArray rows=journal.list();
                for(int i=0;i<rows.length() && sent<3;i++) {
                    if(!diagnosticsPrefs.getBoolean("consent",false)||transactionBusy||token!=null)break;
                    JSONObject row=rows.getJSONObject(i);
                    if(!row.has("endedAt")||row.has("sentAt"))continue;
                    String json=row.toString();DiagnosticsUpload.send(diagnosticsPrefs.getString("endpoint",""),diagnosticsPrefs.getString("access",""),row);journal.sent(row.getString("id"),json);sent++;
                }
                if(id!=null)result(id,new JSONObject().put("sent",sent),null);
            }catch(Exception e){if(id!=null)result(id,null,"Отправка не подтверждена. Отчёты остаются на телефоне; проверь интернет, адрес и код доступа.");}
            finally{syncing=false;}
        }));
    }
    @Override protected void onStart(){super.onStart();foreground=true;main.postDelayed(()->{if(foreground&&!transactionBusy&&token==null)syncDiagnostics(null);},5000);}
    @Override protected void onStop(){foreground=false;super.onStop();if(permissionDevice==null)cancelChoice("Приложение свёрнуто");disconnect("Приложение свёрнуто. Считай мотор заново.");}
    private void setTransactionBusy(boolean value){
        transactionBusy=value;
        if(value)getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
    @Override public void onBackPressed(){confirmExit();}
    private void confirmExit(){
        new AlertDialog.Builder(this).setTitle("Закрыть BBS Flash?").setMessage(transactionBusy?"Сейчас идёт обмен с мотором. Прерывание записи может оставить часть настроек изменённой. Лучше дождаться результата.":"Соединение с мотором будет закрыто.").setPositiveButton("Закрыть",(d,w)->finish()).setNegativeButton("Остаться",null).show();
    }
    @Override protected void onDestroy(){cancelChoice("Приложение закрыто");disconnect("Приложение закрыто");destroyed=true;if(registered)unregisterReceiver(receiver);if(fileCallback!=null)fileCallback.onReceiveValue(null);if(web!=null)web.destroy();commands.shutdown();files.shutdown();diagnostics.shutdown();uploader.shutdown();main.removeCallbacksAndMessages(null);super.onDestroy();}
}

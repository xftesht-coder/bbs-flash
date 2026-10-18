package ru.neochoice.bbsflash;

import android.app.*;
import android.content.*;
import android.hardware.usb.*;
import android.net.Uri;
import android.os.*;
import android.util.Base64;
import android.view.*;
import android.webkit.*;
import androidx.core.content.ContextCompat;
import androidx.webkit.*;
import com.hoho.android.usbserial.driver.*;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

/** Offline WebView UI with an origin-restricted USB bridge. No network permission. */
public final class MainActivity extends Activity {
    private static final String ORIGIN="https://appassets.androidplatform.net";
    private static final String HOME=ORIGIN+"/assets/site/bbs-flash.html";
    private static final int IMPORT=41, EXPORT=42;
    private final Handler main=new Handler(Looper.getMainLooper());
    private final ExecutorService commands=Executors.newSingleThreadExecutor();
    private final ExecutorService files=Executors.newSingleThreadExecutor();
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
        permissionAction=getPackageName()+".USB_PERMISSION";
        IntentFilter filter=new IntentFilter(permissionAction);
        filter.addAction(UsbManager.ACTION_USB_DEVICE_DETACHED);
        ContextCompat.registerReceiver(this,receiver,filter,ContextCompat.RECEIVER_NOT_EXPORTED);
        registered=true;
        web=new WebView(this);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        setContentView(web);
        // Android 15 edge-to-edge: keep controls outside status/navigation bars.
        web.setOnApplyWindowInsetsListener((view,insets)->{
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
                Uri u=request.getUrl();
                if (local(u) && (u.getPath().endsWith("bbs-flash.html") || u.getPath().endsWith("index.html"))) return false;
                if (request.isForMainFrame() && request.hasGesture() && ("https".equals(u.getScheme()) || "mailto".equals(u.getScheme()))) {
                    disconnect("Открыта внешняя ссылка. Подключись заново.");
                    try {startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(ActivityNotFoundException ignored){}
                }
                return true;
            }
            @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap favicon) {
                cancelChoice("Страница перезагружена");disconnect("Страница перезагружена");reply=null;
            }
            @Override public boolean onRenderProcessGone(WebView view,RenderProcessGoneDetail detail) {
                disconnect("WebView остановлен");finish();return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params) {
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
            case "choose": choose(id);break;
            case "close":
                if(!request.has("token") || Objects.equals(token,request.optString("token"))) {
                    cancelChoice("Подключение отменено");disconnect("Соединение закрыто");
                }
                result(id,null,null);break;
            case "open": case "write":
                String session=request.optString("token");
                if(token==null || !token.equals(session)){result(id,null,"Подключись заново");return;}
                commands.execute(()->{
                    try {
                        if(!session.equals(token))throw new IOException("Сеанс закрыт");
                        if(op.equals("open"))open(session);
                        else {
                            byte[] bytes=BridgePolicy.bytes(request.getJSONArray("bytes"));
                            UsbSerialPort current=port;
                            if(current==null || !session.equals(token))throw new IOException("USB отключён");
                            current.write(bytes,2000);
                        }
                        if(!session.equals(token))throw new IOException("Сеанс закрыт");
                        result(id,null,null);
                    } catch(Exception e){result(id,null,"Ошибка USB: "+e.getMessage());if(session.equals(token))disconnect("USB: "+e.getMessage());}
                });break;
            case "save": save(id,request);break;
            default:result(id,null,"Неизвестная команда");
        }
    }
    private void choose(String id) {
        if(token!=null || chooseId!=null){result(id,null,"Сначала отключи текущий кабель");return;}
        List<UsbSerialPort> ports=new ArrayList<>();List<String> names=new ArrayList<>();
        for(UsbSerialDriver driver:UsbSerialProber.getDefaultProber().findAllDrivers(manager)) {
            UsbDevice d=driver.getDevice();
            for(UsbSerialPort p:driver.getPorts()) {ports.add(p);names.add(driver.getClass().getSimpleName().replace("SerialDriver","")+String.format(Locale.ROOT," · %04X:%04X · порт %d",d.getVendorId(),d.getProductId(),p.getPortNumber()+1));}
        }
        if(ports.isEmpty()) {result(id,null,"Кабель USB-UART не найден. Подключи OTG и кабель Bafang. На iQOO проверь переключатель OTG в настройках телефона.");return;}
        chooseId=id;
        chooser=new AlertDialog.Builder(this).setTitle("Выбери кабель Bafang").setItems(names.toArray(new String[0]),(dialog,which)->{
            selected=ports.get(which);UsbDevice device=selected.getDriver().getDevice();
            if(manager.hasPermission(device)){finishChoice();return;}
            permissionDevice=device;
            Intent intent=new Intent(permissionAction).setPackage(getPackageName());
            PendingIntent permission=PendingIntent.getBroadcast(this,0,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_MUTABLE);
            manager.requestPermission(device,permission);
        }).setNegativeButton("Отмена",(d,w)->cancelChoice("Выбор отменён")).setOnCancelListener(d->cancelChoice("Выбор отменён")).show();
    }
    private void finishChoice() {
        if(chooseId==null || selected==null)return;
        token=UUID.randomUUID().toString();UsbDevice d=selected.getDriver().getDevice();
        try {result(chooseId,new JSONObject().put("token",token).put("vendorId",d.getVendorId()).put("productId",d.getProductId()),null);}catch(JSONException ignored){}
        chooseId=null;permissionDevice=null;
    }
    private void cancelChoice(String reason) {
        if(chooseId!=null){result(chooseId,null,reason);chooseId=null;}
        permissionDevice=null;
        if(chooser!=null){chooser.dismiss();chooser=null;}
    }
    private void open(String session) throws IOException {
        UsbSerialPort current=selected;
        if(port!=null || current==null)throw new IOException("Порт недоступен");
        UsbDeviceConnection connection=manager.openDevice(current.getDriver().getDevice());
        if(connection==null)throw new IOException("Нет разрешения Android на USB");
        try {
            current.open(connection);
            current.setParameters(1200,8,UsbSerialPort.STOPBITS_1,UsbSerialPort.PARITY_NONE);
            current.setFlowControl(UsbSerialPort.FlowControl.NONE);
            synchronized(this){if(!session.equals(token))throw new IOException("Сеанс закрыт");port=current;}
        }catch(Exception e){try{current.close();}catch(Exception ignored){}connection.close();throw new IOException(e.getMessage(),e);}
        main.post(()->{if(session.equals(token))getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);});
        Thread reader=new Thread(()->{
            byte[] buffer=new byte[512];
            try {
                while(session.equals(token)){
                    int count=current.read(buffer,250);
                    if(count>0 && session.equals(token)) {
                        JSONArray bytes=new JSONArray();for(int i=0;i<count;i++)bytes.put(buffer[i]&255);
                        event("data",session,bytes,null);
                    }
                }
            }catch(Exception e){if(session.equals(token))disconnect("Кабель отключён или USB недоступен");}
        },"BBS-USB-read");reader.start();
    }
    private void disconnect(String reason) {
        final UsbSerialPort previous;final String previousToken;
        synchronized(this){previous=port;previousToken=token;port=null;token=null;}
        if(previousToken!=null)event("disconnected",previousToken,null,reason);
        if(previous!=null)commands.execute(()->{try{previous.close();}catch(Exception ignored){}});
        main.post(()->getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON));
    }
    private void save(String id,JSONObject request) {
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
    @Override protected void onStop(){super.onStop();if(permissionDevice==null){cancelChoice("Приложение свёрнуто");disconnect("Приложение свёрнуто. Считай мотор заново.");}}
    @Override public void onBackPressed(){
        new AlertDialog.Builder(this).setTitle("Закрыть BBS Flash?").setMessage("Соединение с мотором будет закрыто.").setPositiveButton("Закрыть",(d,w)->finish()).setNegativeButton("Остаться",null).show();
    }
    @Override protected void onDestroy(){cancelChoice("Приложение закрыто");disconnect("Приложение закрыто");destroyed=true;if(registered)unregisterReceiver(receiver);if(fileCallback!=null)fileCallback.onReceiveValue(null);if(web!=null)web.destroy();commands.shutdown();files.shutdown();super.onDestroy();}
}

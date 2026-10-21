package ru.neochoice.bbsflash;

import android.content.Context;
import android.util.AtomicFile;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

/** Bounded, atomic private history. Never stores UART frames, serial numbers or credentials. */
final class ConnectionJournal {
    private final AtomicFile file;
    private JSONArray sessions=new JSONArray();
    ConnectionJournal(Context context) throws IOException,JSONException {
        file=new AtomicFile(new File(context.getFilesDir(),"connections-v1.json"));
        if(file.getBaseFile().exists()) try(InputStream in=file.openRead()) {
            ByteArrayOutputStream bytes=new ByteArrayOutputStream();byte[] buffer=new byte[4096];int count;
            while((count=in.read(buffer))!=-1){if(bytes.size()+count>8*1024*1024)throw new IOException("History too large");bytes.write(buffer,0,count);}
            sessions=new JSONArray(new String(bytes.toByteArray(),StandardCharsets.UTF_8));
        }
        long cutoff=System.currentTimeMillis()-90L*86400000;
        for(int i=sessions.length()-1;i>=0;i--)if(Instant.parse(sessions.getJSONObject(i).getString("startedAt")).toEpochMilli()<cutoff)sessions.remove(i);
        while(sessions.length()>100)sessions.remove(0);
        for(int i=0;i<sessions.length();i++) {
            JSONObject item=sessions.getJSONObject(i);
            if(!item.has("endedAt")){event(item,"interrupted","",0);item.put("endedAt",now());}
        }
        persist();
    }
    private static String now(){return Instant.now().toString();}
    private void persist() throws IOException {
        FileOutputStream out=null;
        try {out=file.startWrite();out.write(sessions.toString().getBytes(StandardCharsets.UTF_8));file.finishWrite(out);}
        catch(IOException error){if(out!=null)file.failWrite(out);throw error;}
    }
    synchronized void start(String id) throws Exception {
        JSONArray kept=new JSONArray();
        long cutoff=System.currentTimeMillis()-90L*86400000;
        for(int i=Math.max(0,sessions.length()-99);i<sessions.length();i++) {
            JSONObject row=sessions.getJSONObject(i);
            if(Instant.parse(row.getString("startedAt")).toEpochMilli()>=cutoff)kept.put(row);
        }
        sessions=kept;
        JSONObject item=new JSONObject().put("id",id).put("startedAt",now()).put("appVersion",BuildConfig.VERSION_NAME).put("androidApi",android.os.Build.VERSION.SDK_INT).put("events",new JSONArray());
        sessions.put(item);event(item,"connecting","",0);persist();
    }
    private JSONObject find(String id) throws JSONException {
        for(int i=sessions.length()-1;i>=0;i--)if(sessions.getJSONObject(i).getString("id").equals(id))return sessions.getJSONObject(i);
        return null;
    }
    private void event(JSONObject row,String type,String code,int block) throws JSONException {
        JSONArray events=row.getJSONArray("events");
        JSONObject item=new JSONObject().put("at",now()).put("type",type);
        if(!code.isEmpty())item.put("code",code);
        if(block!=0)item.put("block",block);
        if(events.length()>0){JSONObject last=events.getJSONObject(events.length()-1);if(last.optString("type").equals(type)&&last.optString("code").equals(code)&&last.optInt("block")==block)return;}
        if(events.length()>=200){events.remove(0);row.put("eventsTruncated",true);}
        events.put(item);row.remove("sentAt");
    }
    synchronized void add(String id,String type,String code,int block) throws Exception {
        JSONObject row=find(id);if(row==null)return;event(row,type,code,block);persist();
    }
    synchronized void usb(String id,int vid,int pid,String driver) throws Exception {
        JSONObject row=find(id);if(row==null)return;
        row.put("usb",new JSONObject().put("vendorId",vid).put("productId",pid).put("driver",driver));persist();
    }
    synchronized void end(String id,String reason) throws Exception {
        JSONObject row=find(id);if(row==null||row.has("endedAt"))return;
        event(row,"disconnected",reason,0);row.put("endedAt",now());persist();
    }
    synchronized JSONArray list() throws JSONException {return new JSONArray(sessions.toString());}
    synchronized void sent(String id,String uploaded) throws Exception {
        JSONObject row=find(id);if(row==null)return;
        JSONObject copy=new JSONObject(row.toString());copy.remove("sentAt");
        if(copy.toString().equals(uploaded)){row.put("sentAt",now());persist();}
    }
    synchronized void clear() throws IOException {sessions=new JSONArray();persist();}
}

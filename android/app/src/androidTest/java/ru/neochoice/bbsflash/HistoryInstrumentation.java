package ru.neochoice.bbsflash;

import android.app.Instrumentation;
import android.app.Activity;
import android.content.Context;
import android.content.ContextWrapper;
import android.os.Bundle;
import java.io.File;
import org.json.*;

/** Runs only with adb instrumentation on the dedicated test emulator. Isolated files. */
public final class HistoryInstrumentation extends Instrumentation {
    @Override public void onCreate(Bundle args){super.onCreate(args);start();}
    private void check(boolean value,String message){if(!value)throw new AssertionError(message);}
    @Override public void onStart(){
        Bundle result=new Bundle();
        try {
            Context isolated=new ContextWrapper(getTargetContext()){
                @Override public File getFilesDir(){File dir=new File(super.getFilesDir(),"history-instrumentation");dir.mkdirs();return dir;}
            };
            ConnectionJournal journal=new ConnectionJournal(isolated);journal.clear();
            journal.start("failed-attempt");journal.add("failed-attempt","not_found","",0);journal.end("failed-attempt","closed");
            journal=new ConnectionJournal(isolated);
            check(journal.list().length()==1,"History survives reopening");
            check(journal.list().getJSONObject(0).getJSONArray("events").getJSONObject(1).getString("type").equals("not_found"),"Failure retained");
            journal.start("interrupted-attempt");journal=new ConnectionJournal(isolated);
            check(journal.list().getJSONObject(1).has("endedAt"),"Interrupted attempt closed on restart");
            journal.start("verified-attempt");journal.add("verified-attempt","written","",0);journal.end("verified-attempt","closed");
            journal.start("long-attempt");
            for(int i=0;i<210;i++)journal.add("long-attempt","read_command","",i+1);
            journal.add("long-attempt","written","",0);journal.end("long-attempt","closed");
            JSONArray events=journal.list().getJSONObject(3).getJSONArray("events");
            check(events.length()==200,"Event bound");
            check(events.getJSONObject(198).getString("type").equals("written"),"Final outcome preserved after capacity reached");
            JSONArray copy=journal.list();copy.getJSONObject(0).put("id","tampered");
            check(!journal.list().getJSONObject(0).getString("id").equals("tampered"),"Snapshots isolated");
            for(int i=0;i<105;i++){journal.start("bounded-"+i);journal.end("bounded-"+i,"closed");}
            journal=new ConnectionJournal(isolated);check(journal.list().length()==100,"100 session bound persisted");
            journal.clear();journal=new ConnectionJournal(isolated);check(journal.list().length()==0,"Clear persisted");
            result.putString("stream","PASS: history persistence, failures, interrupted sessions, snapshot isolation, capacity and clear\n");finish(Activity.RESULT_OK,result);
        }catch(Throwable error){result.putString("stream","FAIL: "+error);finish(Activity.RESULT_CANCELED,result);}
    }
}

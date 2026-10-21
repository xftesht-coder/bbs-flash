package ru.neochoice.bbsflash;
import org.json.*;
import javax.net.ssl.HttpsURLConnection;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.io.*;

final class DiagnosticsUpload {
    static String endpoint(String value) throws Exception {
        URI uri=new URI(value.trim());
        if(!"https".equals(uri.getScheme()) || uri.getHost()==null || uri.getUserInfo()!=null || uri.getQuery()!=null || uri.getFragment()!=null || !uri.getPath().equals("/diagnostics/v1/session"))throw new IOException("Нужен HTTPS-адрес сервера с путём /diagnostics/v1/session");
        return uri.toASCIIString();
    }
    static void send(String endpoint,String access,JSONObject session) throws Exception {
        HttpsURLConnection connection=(HttpsURLConnection)new URL(endpoint(endpoint)).openConnection();
        connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(8000);connection.setReadTimeout(8000);
        connection.setRequestMethod("POST");connection.setRequestProperty("Authorization","Bearer "+access);connection.setRequestProperty("Content-Type","application/json");connection.setDoOutput(true);
        byte[] bytes=new JSONObject().put("schema",1).put("session",session).toString().getBytes(StandardCharsets.UTF_8);
        connection.setFixedLengthStreamingMode(bytes.length);
        try {
            try(OutputStream out=connection.getOutputStream()){out.write(bytes);}
            if(connection.getResponseCode()!=200)throw new IOException("Сервер не подтвердил приём отчёта");
            try(InputStream in=connection.getInputStream()){
                ByteArrayOutputStream output=new ByteArrayOutputStream();byte[] buffer=new byte[1024];int count;
                while((count=in.read(buffer))!=-1){if(output.size()+count>4096)throw new IOException("Некорректный ответ сервера");output.write(buffer,0,count);}
                JSONObject response=new JSONObject(output.toString("UTF-8"));
                if(!response.optBoolean("accepted") || !session.getString("id").equals(response.optString("id")))throw new IOException("Сервер не подтвердил номер отчёта");
            }
        }finally{connection.disconnect();}
    }
}

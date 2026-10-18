package ru.neochoice.bbsflash;
import org.json.*;
final class BridgePolicy {
    static byte[] bytes(JSONArray values) throws JSONException {
        if(values.length()<1 || values.length()>256)throw new JSONException("Некорректный размер UART");
        byte[] out=new byte[values.length()];
        for(int i=0;i<out.length;i++) {
            Object value=values.get(i);
            if(!(value instanceof Number) || ((Number)value).doubleValue()!=((Number)value).intValue() || ((Number)value).intValue()<0 || ((Number)value).intValue()>255)throw new JSONException("Некорректный байт UART");
            out[i]=(byte)((Number)value).intValue();
        }
        return out;
    }
}

package ru.neochoice.bbsflash;
import org.json.*;
import org.junit.Test;
import static org.junit.Assert.*;
public class BridgePolicyTest {
    @Test public void preservesUnsignedBytes() throws Exception {
        assertArrayEquals(new byte[]{0,17,81,(byte)176,(byte)255},BridgePolicy.bytes(new JSONArray("[0,17,81,176,255]")));
    }
    @Test public void rejectsMalformedOrUnboundedWrites() throws Exception {
        for(String input:new String[]{"[]","[-1]","[256]","[1.5]","[null]","[true]","[\"17\"]"}) {
            try {BridgePolicy.bytes(new JSONArray(input));fail(input);}catch(JSONException expected){}
        }
        JSONArray oversized=new JSONArray();for(int i=0;i<257;i++)oversized.put(1);
        try{BridgePolicy.bytes(oversized);fail("oversized");}catch(JSONException expected){}
    }
}

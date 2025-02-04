package org.doichain.doiwallet

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import org.json.JSONArray
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

object MarketAPI {

    private const val TAG = "MarketAPI"
    private val client = OkHttpClient()

    var baseUrl: String? = null

    suspend fun fetchPrice(context: Context, currency: String): String? {
        return try {
            val fiatUnitsJson = context.assets.open("fiatUnits.json").bufferedReader().use { it.readText() }
            val json = JSONObject(fiatUnitsJson)
            val currencyInfo = json.getJSONObject(currency)
            val source = currencyInfo.getString("source")
            val endPointKey = currencyInfo.getString("endPointKey")

            val urlString = buildURLString(source, endPointKey)
            Log.d(TAG, "Fetching price from URL: $urlString")

            val request = Request.Builder().url(urlString).build()
            val response = withContext(Dispatchers.IO) { client.newCall(request).execute() }

            if (!response.isSuccessful) {
                Log.e(TAG, "Failed to fetch price. Response code: ${response.code}")
                return null
            }

            val reader = InputStreamReader(urlConnection.inputStream)
            val jsonResponse = StringBuilder()
            val buffer = CharArray(1024)
            var read: Int
            while (reader.read(buffer).also { read = it } != -1) {
                jsonResponse.append(buffer, 0, read)
            }                    
            
            val result = parseJSONBasedOnSource(jsonResponse.toString(), source, endPointKey)
            Log.d(TAG, "Result_parseJSONBasedOnSource: $result")
            parseJSONBasedOnSource(jsonResponse.toString(), source, endPointKey)
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching price", e)
            null
        }
    }

    private fun buildURLString(source: String, endPointKey: String): String {
        return if (baseUrl != null) {
            baseUrl + endPointKey
        } else {
            when (source) {
                "Yadio" -> "https://api.yadio.io/json/$endPointKey"
                "YadioConvert" -> "https://api.yadio.io/convert/1/BTC/$endPointKey"
                "Exir" -> "https://api.exir.io/v1/ticker?symbol=btc-irt"
                "coinpaprika" -> "https://api.coinpaprika.com/v1/tickers/btc-bitcoin?quotes=INR"
                "Coinpaprika" -> "https://api.coinpaprika.com/v1/tickers/doi-doicoin?quotes=$endPointKey"                
                "Bitstamp" -> "https://www.bitstamp.net/api/v2/ticker/btc${endPointKey.lowercase()}"
                "Coinbase" -> "https://api.coinbase.com/v2/prices/BTC-${endPointKey.uppercase()}/buy"
                "CoinGecko" -> "https://api.coingecko.com/api/v3/simple/price?ids=doichain&vs_currencies=${endPointKey.lowercase()}"
                "BNR" -> "https://www.bnr.ro/nbrfxrates.xml"
                "Kraken" -> "https://api.kraken.com/0/public/Ticker?pair=XXBTZ${endPointKey.uppercase()}"
                else -> "https://api.coindesk.com/v1/bpi/currentprice/$endPointKey.json"
            }
        }
    }

    private fun parseJSONBasedOnSource(jsonString: String, source: String, endPointKey: String): String? {
        return try {
            val json = JSONObject(jsonString)
            when (source) {
                //"Yadio" -> json.getJSONObject(endPointKey).getString("price")
                //"YadioConvert" -> json.getString("rate")
                //"CoinGecko" -> json.getJSONObject("doichain").getString(endPointKey.lowercase())
                //"Exir" -> json.getString("last")
                //"Bitstamp" -> json.getString("last")
                //"Coinpaprika" -> json.getJSONObject("quotes").getJSONObject("USD").getString("price")
                "Coinpaprika" -> "{price:" +  json.getJSONObject("quotes").getJSONObject(endPointKey.uppercase()).getString("price") + ", " + "volume:" + json.getJSONObject("quotes").getJSONObject(endPointKey.uppercase()).getString("volume_24h") + ", " + "percent:" + json.getJSONObject("quotes").getJSONObject(endPointKey.uppercase()).getString("percent_change_24h") + "}"               
                //"Coinbase" -> json.getJSONObject("data").getString("amount")
               // "Kraken" -> json.getJSONObject("result").getJSONObject("XXBTZ${endPointKey.uppercase()}").getJSONArray("c").getString(0)
                else -> null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing price", e)
            null
        }
    }
}
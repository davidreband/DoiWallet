package org.doichain.doiwallet

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import androidx.work.*
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

class WidgetUpdateWorker(context: Context, workerParams: WorkerParameters) : Worker(context, workerParams) {

    companion object {
        const val TAG = "WidgetUpdateWorker"
        const val WORK_NAME = "widget_update_work"
        const val REPEAT_INTERVAL_MINUTES = 15L

        fun scheduleWork(context: Context) {
            val workRequest = PeriodicWorkRequestBuilder<WidgetUpdateWorker>(
                REPEAT_INTERVAL_MINUTES, TimeUnit.MINUTES
            ).build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.REPLACE,
                workRequest
            )
            Log.d(TAG, "Scheduling work for widget updates, will run every $REPEAT_INTERVAL_MINUTES minutes")
        }
    }

    override fun doWork(): Result {
        Log.d(TAG, "Widget update worker running")

        val appWidgetManager = AppWidgetManager.getInstance(applicationContext)
        val thisWidget = ComponentName(applicationContext, BitcoinPriceWidget::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
        val views = RemoteViews(applicationContext.packageName, R.layout.widget_layout)

        val sharedPref = applicationContext.getSharedPreferences("widget_prefs", Context.MODE_PRIVATE)
        val preferredCurrency = sharedPref.getString("preferredCurrency", "USD")
        val preferredCurrencyLocale = sharedPref.getString("preferredCurrencyLocale", "en-US")
        val previousPrice = sharedPref.getString("previous_price", null)

        val currentTime = SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date())

        fetchPrice(preferredCurrency) { fetchedPrice, error ->
            handlePriceResult(
                appWidgetManager, appWidgetIds, views, sharedPref,
                fetchedPrice, previousPrice, currentTime, preferredCurrencyLocale, error
            )
        }

        return Result.success()
    }

    private fun handlePriceResult(
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
        views: RemoteViews,
        sharedPref: SharedPreferences,
        fetchedPrice: String?,
        previousPrice: String?,
        currentTime: String,
        preferredCurrencyLocale: String?,
        error: String?
    ) {
        val isPriceFetched = fetchedPrice != null
        val isPriceCached = previousPrice != null
        val lastUpdateTime = sharedPref.getLong("last_successful_update", 0)
        val currentTimeMillis = System.currentTimeMillis()
        val isCacheStale = currentTimeMillis - lastUpdateTime > TimeUnit.MINUTES.toMillis(30) // Cache expires after 30 minutes

        if (error != null || !isPriceFetched) {
            Log.e(TAG, "Error fetching price: $error")
            if (!isPriceCached || isCacheStale) {
                Log.d(TAG, "No valid cache available, showing error state")
                showLoadingError(views)
            } else {
                Log.d(TAG, "Using cached price from ${Date(lastUpdateTime)}")
                displayCachedPrice(views, previousPrice, currentTime, preferredCurrencyLocale)
            }
        } else {
            Log.d(TAG, "Successfully updated price: $fetchedPrice")
            displayFetchedPrice(
                views, fetchedPrice!!, previousPrice, currentTime, preferredCurrencyLocale
            )
            savePrice(sharedPref, fetchedPrice)
            sharedPref.edit().putLong("last_successful_update", currentTimeMillis).apply()
        }

        appWidgetManager.updateAppWidget(appWidgetIds, views)
    }

    private fun showLoadingError(views: RemoteViews) {
        views.apply {
            setViewVisibility(R.id.loading_indicator, View.GONE)
            setViewVisibility(R.id.price_value, View.VISIBLE)
            setTextViewText(R.id.price_value, "N/A")
            setViewVisibility(R.id.last_updated_label, View.VISIBLE)
            setViewVisibility(R.id.last_updated_time, View.VISIBLE)
            setTextViewText(R.id.last_updated_label, "Error")
            setTextViewText(R.id.last_updated_time, "Price unavailable")
            setViewVisibility(R.id.price_arrow_container, View.GONE)
        }
    }

    private fun displayCachedPrice(
        views: RemoteViews,
        previousPrice: String?,
        currentTime: String,
        preferredCurrencyLocale: String?
    ) {
        val currencyFormat = NumberFormat.getCurrencyInstance(Locale.forLanguageTag(preferredCurrencyLocale!!)).apply {
            maximumFractionDigits = 0
        }

        views.apply {
            setViewVisibility(R.id.loading_indicator, View.GONE)
            setTextViewText(R.id.price_value, currencyFormat.format(previousPrice?.toDouble()?.toInt()))
            setTextViewText(R.id.last_updated_time, currentTime)
            setViewVisibility(R.id.price_value, View.VISIBLE)
            setViewVisibility(R.id.last_updated_label, View.VISIBLE)
            setViewVisibility(R.id.last_updated_time, View.VISIBLE)
            setViewVisibility(R.id.price_arrow_container, View.GONE)
        }
    }

    private fun displayFetchedPrice(
        views: RemoteViews,
        fetchedPrice: String,
        previousPrice: String?,
        currentTime: String,
        preferredCurrencyLocale: String?
    ) {
        val currentPrice =  fetchedPrice.toDouble() // Remove cents
        Log.d(TAG, "Current price: $currentPrice")
        val currencyFormat = NumberFormat.getCurrencyInstance(Locale.forLanguageTag(preferredCurrencyLocale!!)).apply {
            maximumFractionDigits = 2
        }
        Log.d(TAG, "Current currencyFormat: $currencyFormat")

        views.apply {
            setViewVisibility(R.id.loading_indicator, View.GONE)
            setTextViewText(R.id.price_value, currencyFormat.format(currentPrice))
            setTextViewText(R.id.last_updated_time, currentTime)
            setViewVisibility(R.id.price_value, View.VISIBLE)
            setViewVisibility(R.id.last_updated_label, View.VISIBLE)
            setViewVisibility(R.id.last_updated_time, View.VISIBLE)

            if (previousPrice != null) {
                setViewVisibility(R.id.price_arrow_container, View.VISIBLE)
                setTextViewText(R.id.previous_price, currencyFormat.format(previousPrice.toDouble()))
                setImageViewResource(
                    R.id.price_arrow,
                    if (currentPrice > previousPrice.toDouble().toInt()) android.R.drawable.arrow_up_float else android.R.drawable.arrow_down_float
                )
            } else {
                setViewVisibility(R.id.price_arrow_container, View.GONE)
            }
        }
    }

    private fun fetchPrice(currency: String?, callback: (String?, String?) -> Unit) {
        Log.d(TAG, "Fetching price for currency: ${currency ?: "USD"}")        
        val price = MarketAPI.fetchPrice(applicationContext, currency ?: "USD")
        Log.d(TAG, "pricefetchPrice: $price")  
        if (price == null) {
            Log.e(TAG, "Price fetch failed: received null from MarketAPI")
            callback(null, "Failed to fetch price")
        } else {
            Log.d(TAG, "Successfully fetched price: $price")
            callback(price, null)
        }
    }

    private fun savePrice(sharedPref: SharedPreferences, price: String) {
        sharedPref.edit().putString("previous_price", price).apply()
    }
}

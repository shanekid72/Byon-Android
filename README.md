# Lulupay Android SDK Documentation  

Lulupay is an Android SDK designed to provide **seamless remittance and utility payment services** with built-in authentication management. Once authenticated, the SDK automatically handles the remittance screen and other necessary processes, ensuring a smooth user experience.  

---

## 📌 Key Features  

- **Secure Authentication** (Auto Login & Non-Auto Login)  
- **Seamless Remittance and Utility Payment Processing**  
- **Effortless Integration with Minimal Code**  
- **Secure User Credential Management**  
- **Real-time Transaction Status Tracking**  
- **Comprehensive Transaction History Management**  

---

## 🔧 Integration Guide  

### 🚀 Auto Login Mode  

In **Auto Login Mode**, user credentials are **not stored**. This means that credentials must be provided **each time** the user attempts to authenticate. If credentials are missing, an error will occur.  

#### 📌 Implementation Example  

```kotlin
import com.sdk.lulupay.activity.RemittanceScreen

val intent = Intent(
    this@MainActivity,
    RemittanceScreen::class.java
)

intent.putExtra("ISAUTOLOGIN", true) 
intent.putExtra("USERNAME", "testagentae") 
intent.putExtra("PASSWORD", "Admin@123")

startActivity(intent)
```
### 🚀 Non-Auto Login Mode  

In **Non-Auto Login Mode**, credentials are securely stored after the first authentication. Users do not need to enter their login details in subsequent sessions.  

#### 📌 Implementation Example  

```kotlin
import com.sdk.lulupay.activity.RemittanceScreen

val intent = Intent(
    this@MainActivity,
    RemittanceScreen::class.java
)

startActivity(intent)
```

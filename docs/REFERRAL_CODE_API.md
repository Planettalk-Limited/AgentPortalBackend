# 🔗 PlanetTalk Agent Referral API Documentation

This document provides detailed API documentation for the PlanetTalk agent referral system. Agents earn commission by bringing in new customers who use their referral codes for airtime top-ups.

## 🎯 **PlanetTalk Agent Program Overview**

**Become an Agent with PlanetTalk - Make some cash with PlanetTalk!**

- ✅ **Start earning commissions** by bringing in new customers to PlanetTalk
- ✅ **Receive commissions** on each customer for **24 months** from their first successful top-up
- ✅ **Share your unique code** with your network - they use it once and you earn commission every time they top up
- ✅ **Help the diaspora** connect and support their families back home without breaking the bank!

## 📋 **Public Referral Endpoints**

### **🌟 Get Agent Referral Information (PUBLIC)**

**Endpoint:** `GET /public/referral/:code`

**Purpose:** Get agent's personalized referral message and PlanetTalk program info

**Example Request:**
```bash
GET /public/referral/JOHN2024
```

**Response:**
```json
{
  "valid": true,
  "agent": {
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "agentCode": "AGT12345",
    "tier": "gold"
  },
  "program": {
    "title": "Become an Agent with PlanetTalk",
    "subtitle": "Make some cash with PlanetTalk!",
    "description": "Start earning commissions by bringing in new customers to PlanetTalk.",
    "benefits": [
      "Receive commissions on each customer for 24 months from their first successful top-up",
      "Share your unique code with your network, they use it once and you earn commission every time they top up",
      "Help the diaspora connect and support their families back home without breaking the bank!"
    ]
  },
  "personalizedMessage": "Hi, my name is John Doe. Here is my referral code for PlanetTalk airtime services. Use my code when you sign up and I'll earn commission every time you top up for the next 24 months. Help the diaspora connect and support their families back home without breaking the bank!",
  "codeDetails": {
    "code": "JOHN2024",
    "type": "standard",
    "description": "John's personal referral code",
    "bonusRate": 2.5,
    "remainingUses": 85,
    "expiresAt": "2024-12-31T23:59:59.000Z"
  },
  "callToAction": {
    "primary": "Sign up with this code to get started",
    "secondary": "Your agent will earn commission on every top-up you make for 24 months",
    "buttonText": "Use This Code"
  }
}
```

### **👤 Get Agent Info Only (PUBLIC)**

**Endpoint:** `GET /public/referral/:code/agent`

**Purpose:** Get just the agent information for a referral code

**Response:**
```json
{
  "valid": true,
  "agent": {
    "firstName": "John",
    "lastName": "Doe", 
    "fullName": "John Doe",
    "agentCode": "AGT12345",
    "tier": "gold"
  },
  "message": "Hi, my name is John Doe. Here is my referral code for PlanetTalk airtime services..."
}
```

---

## 📋 **Agent Management Endpoints**

### **1. Create Referral Code**

**Endpoint:** `POST /agents/:agentId/referral-codes` 🔒

**Purpose:** Create a new referral code for an agent

**Request:**
```json
{
  "code": "SUMMER2024",
  "type": "promotional",
  "description": "Summer promotion for new customers",
  "bonusCommissionRate": 5.0,
  "maxUses": 100,
  "expiresAt": "2024-12-31T23:59:59.000Z",
  "metadata": {
    "baseCommissionAmount": 150.00,
    "targetAudience": "Individual customers",
    "campaignName": "Summer 2024 Drive"
  }
}
```

**Response:**
```json
{
  "id": "uuid",
  "code": "SUMMER2024",
  "status": "active",
  "type": "promotional",
  "description": "Summer promotion for new customers",
  "bonusCommissionRate": 5.0,
  "currentUses": 0,
  "maxUses": 100,
  "expiresAt": "2024-12-31T23:59:59.000Z",
  "createdAt": "2024-09-24T10:00:00.000Z",
  "updatedAt": "2024-09-24T10:00:00.000Z",
  "agentId": "agent-uuid",
  "metadata": {
    "baseCommissionAmount": 150.00,
    "targetAudience": "Individual customers",
    "campaignName": "Summer 2024 Drive"
  }
}
```

---

### **2. Get Agent Referral Codes**

**Endpoint:** `GET /agents/:agentId/referral-codes` 🔒

**Purpose:** Get all referral codes for an agent

**Response:**
```json
[
  {
    "id": "uuid",
    "code": "SUMMER2024",
    "status": "active",
    "type": "promotional", 
    "description": "Summer promotion for new customers",
    "bonusCommissionRate": 5.0,
    "currentUses": 15,
    "maxUses": 100,
    "remainingUses": 85,
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "createdAt": "2024-09-24T10:00:00.000Z",
    "lastUsedAt": "2024-09-24T15:30:00.000Z",
    "agent": {
      "agentCode": "AGT12345",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe"
    }
  }
]
```

---

### **3. Use Referral Code** ⭐

**Endpoint:** `POST /agents/referral-codes/:code/use` 🔒

**Purpose:** Use a referral code to create commission earnings

**Request:**
```json
{
  "referredUserName": "Sarah Wilson",
  "referredUserEmail": "sarah.wilson@example.com", 
  "referredUserPhone": "+1-555-987-6543",
  "metadata": {
    "customerType": "Individual",
    "policyType": "Auto Insurance Policy",
    "policyValue": 1200.00,
    "source": "website",
    "campaign": "summer2024",
    "salesRep": "John Doe",
    "notes": "Customer referred through summer campaign"
  }
}
```

**Response:**
```json
{
  "id": "usage-uuid",
  "referralCodeId": "code-uuid",
  "referredUserName": "Sarah Wilson",
  "referredUserEmail": "sarah.wilson@example.com",
  "referredUserPhone": "+1-555-987-6543",
  "usedAt": "2024-09-24T16:45:00.000Z",
  "status": "confirmed",
  "metadata": {
    "customerType": "Individual",
    "policyType": "Auto Insurance Policy",
    "policyValue": 1200.00,
    "source": "website",
    "campaign": "summer2024",
    "salesRep": "John Doe",
    "notes": "Customer referred through summer campaign"
  },
  "referralCode": {
    "code": "SUMMER2024",
    "type": "promotional",
    "agent": {
      "agentCode": "AGT12345",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe"
    }
  },
  "automaticEarnings": {
    "created": true,
    "amount": 25.00,
    "status": "pending",
    "description": "Referral commission - Sarah Wilson (Auto Insurance Policy)",
    "calculation": {
      "baseAmount": 150.00,
      "agentRate": 15.0,
      "bonusRate": 5.0,
      "totalRate": 20.0,
      "finalAmount": 30.00
    }
  }
}
```

---

### **4. Validate Referral Code (Public)**

**Endpoint:** `GET /public/agents/referral-codes/:code/validate`

**Purpose:** Validate if a referral code is active (public endpoint)

**Response:**
```json
{
  "valid": true,
  "agent": {
    "agentCode": "AGT12345",
    "firstName": "John",
    "lastName": "Doe", 
    "fullName": "John Doe",
    "tier": "gold"
  },
  "details": {
    "type": "promotional",
    "description": "Summer promotion for new customers",
    "bonusCommissionRate": 5.0,
    "remainingUses": 85,
    "expiresAt": "2024-12-31T23:59:59.000Z"
  },
  "message": "Hi, my name is John Doe. Here is my referral code for exclusive benefits and savings on your insurance needs!"
}
```

## 💰 **Automatic Earnings Creation**

### **When Referral Code is Used:**

1. **✅ Automatic Calculation:**
   ```
   Commission = Base Amount × (Agent Rate + Bonus Rate) / 100
   Example: $150 × (15% + 5%) / 100 = $30.00
   ```

2. **✅ Earnings Record Created:**
   - **Status:** `pending` (awaits admin approval)
   - **Amount:** Calculated commission
   - **Type:** `referral_commission`
   - **Reference:** `REF-SUMMER2024-2024-001`

3. **✅ Agent Balance Updated:**
   - **Pending Balance:** Increased by commission amount
   - **Total Referrals:** Incremented
   - **Active Referrals:** Incremented

4. **✅ Email Notification:**
   - Agent receives email about new pending commission
   - Includes customer details and amount

## 🎯 **Frontend Integration Examples**

### **Agent Profile with Referral Message:**
```typescript
const AgentProfile = ({ agent }) => {
  const referralMessage = `Hi, my name is ${agent.fullName}. Here is my referral code for exclusive benefits and savings on your insurance needs!`;
  
  return (
    <div>
      <h2>{agent.fullName}</h2>
      <p>Agent Code: {agent.agentCode}</p>
      <p>Tier: {agent.tier}</p>
      
      <div className="referral-message">
        <h3>My Referral Message:</h3>
        <p>{referralMessage}</p>
      </div>
      
      <div className="referral-codes">
        {agent.referralCodes.map(code => (
          <div key={code.id} className="referral-code">
            <strong>{code.code}</strong>
            <p>{code.description}</p>
            <p>Uses: {code.currentUses}/{code.maxUses}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### **Public Referral Code Validation:**
```typescript
const validateReferralCode = async (code) => {
  const response = await fetch(`/public/agents/referral-codes/${code}/validate`);
  const data = await response.json();
  
  if (data.valid) {
    // Show agent's personalized message
    document.getElementById('agent-message').innerHTML = data.message;
    // Show available benefits
    showReferralBenefits(data.details);
  } else {
    showError('Invalid or expired referral code');
  }
};
```

### **Using Referral Code:**
```typescript
const useReferralCode = async (code, customerData) => {
  const response = await fetch(`/agents/referral-codes/${code}/use`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      referredUserName: customerData.name,
      referredUserEmail: customerData.email,
      referredUserPhone: customerData.phone,
      metadata: {
        customerType: 'Individual',
        policyType: 'Auto Insurance Policy',
        policyValue: customerData.policyValue,
        source: 'agent-portal',
        notes: 'Direct agent referral'
      }
    })
  });
  
  const result = await response.json();
  
  if (result.automaticEarnings?.created) {
    showSuccess(`Commission of $${result.automaticEarnings.amount} created and pending approval!`);
  }
  
  return result;
};
```

## 📱 **Airtime Payout Example**

### **Simplified Airtime Request:**
```json
{
  "amount": 30.00,
  "method": "airtime_topup",
  "description": "Weekly airtime allowance",
  "paymentDetails": {
    "airtimeTopup": {
      "phoneNumber": "+263771234567",
      "accountName": "John Doe"
    }
  }
}
```

**Response:**
```json
{
  "id": "payout-uuid",
  "status": "requested", 
  "amount": 30.00,
  "method": "airtime_topup",
  "description": "Weekly airtime allowance",
  "paymentDetails": {
    "airtimeTopup": {
      "phoneNumber": "+263771234567",
      "accountName": "John Doe",
      "detectedCarrier": "Econet",
      "detectedCountry": "Zimbabwe"
    }
  },
  "requestedAt": "2024-09-24T16:45:00.000Z",
  "agent": {
    "agentCode": "AGT12345",
    "fullName": "John Doe"
  }
}
```

## 🎭 **Personalization Features**

### **Agent Referral Messages:**
```javascript
// Examples of personalized referral messages
const messages = {
  standard: `Hi, my name is ${agent.fullName}. Here is my referral code for exclusive benefits and savings on your insurance needs!`,
  
  promotional: `Hi, my name is ${agent.fullName}. I'm excited to share my special ${code.description} referral code with you for amazing savings!`,
  
  vip: `Hi, my name is ${agent.fullName}. As a VIP agent, I'm offering you exclusive access to premium insurance benefits through my referral code!`,
  
  limited_time: `Hi, my name is ${agent.fullName}. Don't miss out! My limited-time referral code expires ${code.expiresAt} - get your savings now!`
};
```

### **Dynamic Message Generation:**
The system can generate personalized messages based on:
- ✅ **Agent's full name**
- ✅ **Referral code type**
- ✅ **Code description**
- ✅ **Agent tier level**
- ✅ **Bonus commission rate**
- ✅ **Expiration date**

---

**Ready for agents to create personalized referral experiences with automatic commission tracking!** 🔗💰✨

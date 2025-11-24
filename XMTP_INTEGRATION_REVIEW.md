# XMTP Integration Review & Troubleshooting Guide

## 📁 All XMTP-Related Files

### Core Files
1. **src/contexts/XmtpContext.tsx** - XMTP client state management
2. **src/lib/worldChainAuth.ts** - World Chain authentication & signer creation
3. **src/components/XMTPInbox.tsx** - Single conversation messaging UI
4. **src/components/MessagingInterface.tsx** - Full inbox with conversation list
5. **src/lib/xmtpConversationManager.ts** - LocalStorage conversation management

### Supporting Files
6. **src/components/ConversationListItem.tsx** - Individual conversation list item UI
7. **src/components/XMTPSettings.tsx** - XMTP settings panel
8. **supabase/functions/send-world-notification/index.ts** - Push notifications
9. **supabase/functions/generate-siwe-nonce/index.ts** - SIWE nonce generation
10. **supabase/functions/verify-siwe-message/index.ts** - SIWE signature verification

---

## 🔧 Recent Fixes Applied (2025-01-24)

### 1. Message Streaming API (CRITICAL)
**Issue**: Used wrong SDK method `streamMessages()` instead of `stream()`
**Fixed in**: 
- `src/components/XMTPInbox.tsx` line 120
- `src/components/MessagingInterface.tsx` line 295

**Before**:
```typescript
for await (const message of await conversation.streamMessages()) {
```

**After**:
```typescript
for await (const message of await conversation.stream()) {
```

### 2. Address Normalization
**Issue**: Addresses weren't lowercased before creating DMs
**Fixed in**:
- `src/components/XMTPInbox.tsx` line 83
- `src/components/MessagingInterface.tsx` line 421

**Before**:
```typescript
dm = await client.conversations.newDm(profileAddress);
```

**After**:
```typescript
dm = await client.conversations.newDm(profileAddress.toLowerCase());
```

### 3. Mobile Keyboard Support
**Fixed**:
- Added `fontSize: '16px'` to prevent iOS zoom (XMTPInbox.tsx line 290)
- Removed `disabled={isSending}` from message input (MessagingInterface.tsx line 766)
- Kept `WebkitUserSelect: 'text'` for text selection

### 4. Enhanced Error Logging
**Added** comprehensive logging in both send message functions:
- Conversation object details
- Error messages and stack traces
- Success/failure toast notifications

---

## 🐛 Known Issues & Debugging Steps

### Issue: "Cannot Send Messages"

**Step 1: Check Console Logs**
Look for these specific log patterns:

```
✅ Expected logs (working):
🔄 Connecting to XMTP via World Chain
✅ Wallet auth signature received from World App
✅ SIWE signature verified
✅ XMTP client ready. Inbox ID: [inbox_id]
🔄 Checking if can message: [address]
✅ Target can receive messages
✅ New DM created (or Found existing DM)
📤 Sending message: [text]
✅ Message sent successfully
📨 New message received: [message_id]

❌ Problem indicators:
❌ MiniKit not installed
❌ Wallet authentication failed
❌ Signature verification failed
❌ Failed to initialize XMTP client
⚠️ Target address cannot receive XMTP messages
❌ Failed to send message
```

**Step 2: Verify Prerequisites**
1. App must be opened in World App (MiniKit.isInstalled())
2. User must complete wallet authentication
3. Target address must be on XMTP network
4. Conversation object must have `send()` method

**Step 3: Check Network Requests**
Monitor these edge function calls:
- `generate-siwe-nonce` - Should return nonce
- `verify-siwe-message` - Should return success: true
- Check for any 500/400 errors

**Step 4: Test Send Function**
When you try to send, check console for:
```javascript
📤 Sending message: [your text]
📤 Conversation object: {
  id: "[conversation_id]",
  peerAddress: "[0x...]",
  dmPeerInboxId: "[peer_inbox_id]",
  hasSendMethod: true  // ← MUST be true
}
```

If `hasSendMethod: false`, the conversation object is corrupted.

---

## 🔍 Common Error Scenarios

### 1. "Installation limit reached"
**Cause**: XMTP allows 1 installation per address in IndexedDB
**Solution**: 
```javascript
// Clear IndexedDB in browser DevTools:
indexedDB.deleteDatabase('xmtp');
// Or clear all site data
```

### 2. "Target cannot receive messages"
**Cause**: Recipient hasn't created an XMTP client yet
**Solution**: They need to connect to XMTP first (one-time setup)

### 3. Messages don't appear in real-time
**Cause**: Message streaming not working
**Check**: 
- Line 120 in XMTPInbox.tsx uses `stream()` not `streamMessages()`
- Line 295 in MessagingInterface.tsx uses `stream()` not `streamMessages()`

### 4. Keyboard doesn't appear on mobile
**Check**:
- Input has `fontSize: '16px'` (prevents iOS zoom)
- Input is NOT disabled
- Input has `touch-manipulation` style

---

## 📱 Mobile-Specific Issues

### iOS Keyboard
**Requirements**:
```typescript
style={{ 
  WebkitUserSelect: 'text',
  fontSize: '16px',  // Prevents zoom
  touchAction: 'manipulation'
}}
```

### Android Keyboard
**Requirements**:
- `inputMode="text"`
- No `disabled` attribute
- `autoComplete="off"` to prevent autocomplete dropdown

---

## 🧪 Testing Checklist

### Connection Test
- [ ] App opens in World App
- [ ] Wallet authentication prompt appears
- [ ] Signature verification succeeds
- [ ] XMTP client initializes
- [ ] Console shows "✅ XMTP client ready"

### Messaging Test
- [ ] Can start new conversation
- [ ] Can see existing conversations
- [ ] Keyboard appears when tapping input
- [ ] Can type message
- [ ] Send button becomes enabled
- [ ] Message sends successfully
- [ ] Sent message appears in chat
- [ ] Can receive messages
- [ ] New messages appear in real-time

---

## 🔑 SDK v5 API Reference

### Client Creation
```typescript
const client = await Client.create(signer, {
  env: 'production'
});
```

### Check if Address Can Message
```typescript
const canMsg = await client.canMessage([{
  identifier: address.toLowerCase(),
  identifierKind: 'Ethereum'
}]);
```

### Create or Get DM
```typescript
const dm = await client.conversations.newDm(address.toLowerCase());
```

### Stream Messages (CORRECT)
```typescript
for await (const message of await conversation.stream()) {
  // Handle message
}
```

### Send Message
```typescript
await conversation.send(textMessage);
```

---

## 🎯 Next Steps to Debug

1. **Open DevTools Console** in World App browser
2. **Try to send a message**
3. **Copy ALL console logs** starting from "🔄 Connecting to XMTP"
4. **Look for red error messages** (❌)
5. **Check what happens at "📤 Sending message"**
6. **Share the exact error message**

The enhanced logging will now show:
- Exact conversation object state
- Whether `send()` method exists
- Full error stack traces
- Success confirmations

---

## 📞 Support Resources

- **XMTP Docs**: https://docs.xmtp.org/
- **Browser SDK**: https://github.com/xmtp/xmtp-js
- **MiniKit Docs**: https://docs.world.org/mini-apps
- **SIWE Spec**: https://eips.ethereum.org/EIPS/eip-4361

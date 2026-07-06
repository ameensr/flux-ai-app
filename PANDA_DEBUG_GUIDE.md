# 🐼 Lazy Panda Debugging Guide

This guide helps you verify that all Lazy Panda features are working correctly.

## ✅ Features Fixed in This Update

### 1. Interactive Message Replies ✅
Both Event Greetings and Weekend Messages now show panda's reply after user selection.

**What was fixed:**
- Added `showReply` state to track when to show reply
- Added `replyMessage` state to store the reply text
- Replies now show for 3.5 seconds before auto-dismissing
- AnimatePresence handles smooth transitions between question and reply

### 2. Walking Animation ✅
**Implementation:**
- Triggers after 3-5 seconds of idle time
- 30% chance to start walking every 2.5 seconds
- 40% chance to stop walking and return to idle
- Horizontal sway animation (x: [0, 2, 0, -2, 0])

### 3. Password Peek ✅
**How it works:**
- Password focus → `PASSWORD_HIDE` state (covers eyes)
- Show password toggle ON → `PASSWORD_SHOW` state (one eye peeks)
- Right eyebrow raises
- Right eye stays open

### 4. Cursor Tracking ✅
**Behavior:**
- Only active when email field is focused (`LOOKING_AT_EMAIL` state)
- Requires both `emailTracking` AND `cursorTracking` features enabled
- Head rotates ±20° following cursor
- Eyes shift ±10° to track cursor

---

## 🔍 Debugging Steps

### Check Feature Toggles
1. Open browser console (F12)
2. Go to Admin Panel → LazyPanda Config
3. Toggle a feature on/off
4. Check console for: `[LazyPanda] Features updated: { feature: true/false }`

### Test Interactive Messages

#### Weekend Messages:
1. Open login page on a weekend
2. Should see message bubble above panda
3. Click a response button
4. Verify: Reply shows for 3.5 seconds
5. Check console for message selection

#### Event Greetings:
1. Admin → LazyPanda → Event & Greetings
2. Add a test event for today
3. Refresh login page
4. Click action button
5. Verify reply shows

**Console logs to look for:**
```
[EventGreetingBubble] Active event found: ...
[PandaSpeechBubble] Message picked: ...
```

### Test Walking Animation

**Steps:**
1. Enable "Walking Animation" feature
2. Go to login page
3. Don't touch mouse/keyboard for 5 seconds
4. Check console for:
   ```
   [LazyPanda] Walking animation enabled
   [LazyPanda] Starting walk animation
   [LazyPanda] State transition: IDLE → WALKING
   ```
5. Observe panda swaying side-to-side

**Troubleshooting:**
- If no walking → Check console for "[LazyPanda] Walking disabled"
- If console says enabled but no animation → Verify SVG animation in PandaSVG.tsx line with `isWalking`
- Animation should be: `x: isWalking ? [0, 2, 0, -2, 0] : 0`

### Test Password Peek

**Steps:**
1. Enable "Show Password Peek" feature
2. Click password field
3. Check console:
   ```
   [LazyPanda] Event received: PASSWORD_FOCUS
   [LazyPanda] State transition: IDLE → PASSWORD_HIDE
   ```
4. Observe: Panda covers eyes with both paws
5. Click "Show password" eye icon
6. Check console:
   ```
   [LazyPanda] Event received: PASSWORD_SHOW_TOGGLE
   [LazyPanda] Password show toggle: true
   [LazyPanda] State transition: PASSWORD_HIDE → PASSWORD_SHOW
   ```
7. Observe: Right paw lowers, right eye opens, eyebrow raises

**Troubleshooting:**
- If panda doesn't react → Check console for "Password event blocked"
- Verify AuthPage.tsx has:
  ```tsx
  onFocus={() => pandaSend({ type: 'PASSWORD_FOCUS' })}
  onClick={() => { 
    const next = !showPassword; 
    setShowPassword(next); 
    pandaSend({ type: 'PASSWORD_SHOW_TOGGLE', visible: next }) 
  }}
  ```

### Test Cursor Tracking

**Steps:**
1. Enable BOTH features:
   - "Email Tracking" ✓
   - "Cursor Tracking" ✓
2. Click email field
3. Check console:
   ```
   [LazyPanda] Event received: EMAIL_FOCUS
   [LazyPanda] State transition: IDLE → LOOKING_AT_EMAIL
   [LazyPanda] Cursor tracking effect - enabled: true, state: LOOKING_AT_EMAIL
   ```
4. Move mouse around screen
5. Observe: Panda's head and eyes follow cursor

**Troubleshooting:**
- If no tracking → Check BOTH features are enabled
- Console should show: `Cursor tracking effect - enabled: true`
- If state is not `LOOKING_AT_EMAIL`, tracking won't work
- Verify email field has:
  ```tsx
  onFocus={() => pandaSend({ type: 'EMAIL_FOCUS' })}
  ```

### Test Easter Eggs

**Steps:**
1. Enable "Easter Eggs" feature
2. Click panda 3 times quickly
3. Observe: Success animation with sparkles
4. Click panda 6 times total
5. Observe: Falls asleep, then wakes up after 2s

---

## 📝 Console Log Reference

### Normal Operation:
```
[LazyPanda] Features updated: { walking: true, emailTracking: true, ... }
[LazyPanda] Event received: EMAIL_FOCUS Features: { ... }
[LazyPanda] State transition: IDLE → LOOKING_AT_EMAIL
[LazyPanda] Cursor tracking effect - enabled: true, state: LOOKING_AT_EMAIL
```

### Feature Blocked:
```
[LazyPanda] Email event blocked - emailTracking disabled
[LazyPanda] Password event blocked - passwordCover disabled
[LazyPanda] Password peek blocked - passwordPeek disabled
```

### Walking Animation:
```
[LazyPanda] Walking animation enabled
[LazyPanda] Starting walk animation
[LazyPanda] State transition: IDLE → WALKING
[LazyPanda] Stopping walk animation
[LazyPanda] State transition: WALKING → IDLE
```

---

## 🐛 Common Issues

### Issue: "Features updated but behavior doesn't change"
**Solution:** Hard refresh the page (Ctrl+Shift+R) to clear localStorage cache

### Issue: "Panda doesn't respond to password field"
**Check:**
1. Feature toggle is ON
2. AuthPage event handlers are attached
3. Console shows events being received
4. State machine transitions are firing

### Issue: "Walking animation starts immediately"
**This is wrong!** Walking should only start after 3-5 seconds idle.
**Check:** `elapsed > 3000` condition in walking effect

### Issue: "Cursor tracking works but eyes don't move"
**Check:**
1. PandaSVG eyeOffset props are being passed
2. Motion animation in SVG eyes is active
3. Console shows eyeOffset values changing

### Issue: "Message replies don't show"
**Check:**
1. `showReply` state is being set to true
2. AnimatePresence mode is "wait"
3. Reply timeout is firing (3500ms)
4. Console for any React errors

---

## 🎯 Feature Checklist

Use this to verify all features work:

- [ ] Walking Animation - Panda sways after 3-5s idle
- [ ] Email Tracking - Eyes follow cursor when email focused
- [ ] Password Cover - Covers eyes when password focused
- [ ] Show Password Peek - One eye peeks when show password ON
- [ ] Login Success - Sparkles on successful login
- [ ] Login Failure - Confused reaction on error
- [ ] Idle Sleep - Falls asleep after 15s inactivity
- [ ] Cursor Tracking - Head follows cursor (email focused only)
- [ ] Loading Animation - Laptop + coffee during login
- [ ] Easter Eggs - Click reactions (3 clicks = celebrate, 6 = sleep)
- [ ] Micro Animations - Blinking, breathing, tail wag
- [ ] Weekend Messages - Interactive replies show
- [ ] Event Greetings - Interactive replies show

---

## 📞 Still Not Working?

1. Open browser DevTools (F12)
2. Go to Console tab
3. Copy all logs starting with `[LazyPanda]`
4. Check for JavaScript errors (red text)
5. Verify localStorage has `qaly-panda-config` key
6. Check if features object has all properties

**Last Resort:**
```javascript
// Paste in console to reset everything
localStorage.removeItem('qaly-panda-config')
localStorage.removeItem('qaly-panda-messages-config')
localStorage.removeItem('qaly-event-greetings-config')
location.reload()
```

---

## ✨ Success Indicators

You'll know everything is working when:
1. Console shows feature updates
2. State transitions log correctly
3. Panda reacts to form interactions
4. Walking starts randomly when idle
5. Message replies appear after button clicks
6. Easter eggs trigger on multiple clicks

Happy debugging! 🐼✨

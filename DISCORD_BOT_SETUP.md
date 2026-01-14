# 🤖 Discord Bot Setup Guide

To display Discord server members in the admin dashboard, you need to create a Discord Bot.

---

## 📋 Step 1: Create Discord Bot

1. **Go to Discord Developer Portal:**
   - Visit: https://discord.com/developers/applications
   - Click on your existing application (or create a new one)

2. **Go to Bot Section:**
   - Click **Bot** in the left sidebar
   - If you don't have a bot yet, click **Add Bot**

3. **Get Bot Token:**
   - Under **TOKEN**, click **Reset Token**
   - Copy the token (you'll only see it once!)
   - Save it as `DISCORD_BOT_TOKEN` in your environment variables

4. **Enable Intents:**
   Scroll down to **Privileged Gateway Intents** and enable:
   - ✅ **SERVER MEMBERS INTENT** (Required!)
   - ✅ **PRESENCE INTENT** (Optional)
   - ✅ **MESSAGE CONTENT INTENT** (Optional)

5. **Click Save Changes**

---

## 📋 Step 2: Invite Bot to Your Server

1. **Go to OAuth2 → URL Generator:**
   - In the left sidebar, click **OAuth2** → **URL Generator**

2. **Select Scopes:**
   - ✅ `bot`

3. **Select Bot Permissions:**
   - ✅ **Read Messages/View Channels**
   - ✅ **View Server Insights**
   - ✅ **Manage Server** (Required for member list!)
   - ✅ **Manage Nicknames** (Required for [LOA] tag functionality!)
   - ✅ **Read Message History**

4. **Copy the Generated URL:**
   - Scroll down and copy the generated URL
   - Paste it in your browser
   - Select your Discord server
   - Click **Authorize**

---

## 📋 Step 3: Get Guild ID

1. **Enable Developer Mode in Discord:**
   - Open Discord
   - Go to **User Settings** → **Advanced**
   - Enable **Developer Mode**

2. **Get Your Server ID:**
   - Right-click on your server icon
   - Click **Copy Server ID**
   - Save it as `DISCORD_GUILD_ID`

---

## 📋 Step 4: Add Environment Variables

### **Local Development (.env.local):**
```env
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_server_id_here
```

### **Vercel (Production):**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   ```
   DISCORD_BOT_TOKEN=your_bot_token_here
   DISCORD_GUILD_ID=your_server_id_here
   ```
3. Select: **Production**, **Preview**, **Development**
4. Click **Save**
5. **Redeploy** your app

---

## 🏷️ [LOA] Tag Functionality

The bot automatically adds and removes `[LOA]` tags from member nicknames:

### What it does:
- ✅ **Adds [LOA]** when a leave of absence is submitted
- ✅ **Removes [LOA]** when a leave is ended/returned
- ✅ **Updates both Discord nickname and database display name**

### Requirements:
- ✅ **Manage Nicknames** permission (must be selected in OAuth2)
- ✅ **DISCORD_BOT_TOKEN** environment variable
- ✅ **DISCORD_GUILD_ID** environment variable

### How it works:
1. When a leave is submitted → Bot adds `[LOA]` to the user's nickname
2. When a leave ends → Bot removes `[LOA]` from the user's nickname
3. Changes are synchronized between Discord and your database

---

## ✅ Test It

1. **Sign in as Admin**
2. **Go to `/admin`**
3. **You should see the Discord Members list!**

The list will show:
- Member avatars
- Usernames and nicknames
- Join dates
- Search functionality
- Refresh button

---

## 🔒 Security Notes

- **Never commit** `DISCORD_BOT_TOKEN` to Git
- Keep it in `.env.local` (already in `.gitignore`)
- The bot token gives full access to your bot
- Only admins can access the members list (protected by role check)

---

## 🐛 Troubleshooting

### "Discord configuration missing"
- Make sure `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID` are set
- Check they're set in the right environment (local vs Vercel)
- Redeploy after adding env vars in Vercel

### "Failed to fetch Discord members"
- Make sure **SERVER MEMBERS INTENT** is enabled in Discord Developer Portal
- Verify the bot is in your server
- Check the bot has permission to view members

### "Forbidden" error
- Make sure you're signed in
- Verify your role is ADMIN, LEADER, or MODERATOR in Supabase

### "[LOA] tag not adding/removing"
- Make sure **Manage Nicknames** permission is enabled in Discord
- Verify `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID` are set correctly
- Check the bot has a role that's above all member roles in Discord
- Ensure the bot is not being rate-limited by Discord

### "Failed to update Discord nickname" in logs
- Check if the bot has "Manage Nicknames" permission
- Verify the target user is in the server
- Check if the bot's role is higher than the target user's role
- Look for rate limiting (Discord limits nickname changes)

---

## 📊 What You Get

The Discord Members list shows:
- ✅ All human members (bots filtered out)
- ✅ Member avatars
- ✅ Usernames and discriminators
- ✅ Nicknames (if set)
- ✅ Join dates
- ✅ Search functionality
- ✅ Refresh button
- ✅ Member count
- ✅ Scrollable list

---

**Your admin dashboard will now show live Discord server members!** 🎉

# ⚔️ Faction Wars System Guide

Complete guide for the Faction Wars feature in the 83 Hoover Criminals platform.

---

## 📋 Overview

The Faction Wars system allows admins to track ongoing conflicts with rival factions. Members can view active wars and submit encounter logs with detailed information about each engagement.

---

## 🎯 Features

### **For Admins:**
- ✅ Start new wars against enemy factions
- ✅ End active wars
- ✅ View war statistics
- ✅ Delete any war logs

### **For Members:**
- ✅ View all active and ended wars
- ✅ Submit encounter logs for active wars
- ✅ Select 83 Hoovers involved from Discord members
- ✅ Track enemy players killed
- ✅ Add notes and evidence (images)
- ✅ Delete their own logs

---

## 🗄️ Database Setup

### **Run the Migration:**

The faction wars tables are created automatically when you run the migration:

```bash
# Apply the migration to your Supabase database
# Go to Supabase Dashboard → SQL Editor → New Query
# Copy and paste the contents of: supabase/migrations/004_faction_wars.sql
# Click "Run"
```

### **Tables Created:**

**1. `faction_wars`**
- Stores information about each war
- Fields: enemy_faction, status, started_at, ended_at, started_by

**2. `war_logs`**
- Stores encounter logs for each war
- Fields: war_id, date_time, hoovers_involved, players_killed, notes, evidence_url, submitted_by

---

## 🚀 Usage

### **Admin: Starting a War**

1. Go to `/admin`
2. Find the **War Management** panel
3. Click **Start War**
4. Enter the enemy faction name (e.g., "Eastside Hustler Crip")
5. Click **Start War**

The war is now active and visible to all members!

### **Admin: Ending a War**

1. Go to `/admin`
2. Find the active war in **War Management**
3. Click **End War**
4. Confirm the action

The war moves to "War History" and members can no longer add logs.

---

### **Members: Viewing Wars**

1. Click **Wars** in the navigation menu
2. See two tabs:
   - **Active Wars** - Ongoing conflicts
   - **War History** - Ended wars
3. Click on any war to view details and logs

---

### **Members: Adding an Encounter Log**

1. Go to `/wars` and click on an active war
2. Click **Add Log** button
3. Fill in the form:

**Date & Time:**
- Select the date and time of the encounter

**83 Hoovers Involved:**
- Search for Discord members by name
- Click to add them to the list
- Remove by clicking the X on their name tag

**Players Killed:**
- Enter enemy player names separated by commas
- Example: `John_Doe, Jane_Doe, Mike_Smith`

**Notes (Optional):**
- Add any additional details about the encounter
- Describe what happened, location, etc.

**Evidence (Optional):**
- Upload your screenshot to Imgur or similar
- Paste the image URL
- The image will be displayed in the log

4. Click **Add Log**

---

### **Members: Deleting Your Log**

1. Go to the war detail page
2. Find your log
3. Click the trash icon
4. Confirm deletion

**Note:** Admins can delete any log, members can only delete their own.

---

## 📊 War Statistics

Each war page shows:
- **Total Encounters** - Number of logs submitted
- **Enemy Players Killed** - Total kills across all encounters
- **83 Hoovers Involved** - Unique members who participated

---

## 🎨 UI Components

### **Wars List Page (`/wars`)**
- Grid view of all wars
- Tabs for Active/Ended wars
- Stats overview
- Click to view details

### **War Detail Page (`/wars/[id]`)**
- War information and status
- Statistics cards
- Chronological list of encounter logs
- Add Log button (for active wars)

### **Admin Panel (`/admin`)**
- War Management widget
- Start/End wars
- View active wars list

---

## 🔒 Permissions

### **View Wars:**
- ✅ Everyone (no login required)

### **Add Logs:**
- ✅ Authenticated users only
- ✅ Only for active wars

### **Delete Logs:**
- ✅ Log owner can delete their own
- ✅ Admins can delete any log

### **Start/End Wars:**
- ✅ ADMIN role only
- ✅ LEADER role only
- ✅ MODERATOR role only

---

## 🎯 Best Practices

### **For Admins:**
1. Start wars only for significant conflicts
2. End wars when the conflict is resolved
3. Monitor logs for inappropriate content
4. Use clear, recognizable faction names

### **For Members:**
1. Submit logs promptly after encounters
2. Be accurate with dates/times
3. Include all participants
4. Add evidence when possible
5. Write clear, descriptive notes

---

## 🐛 Troubleshooting

### **Can't see Discord members in dropdown:**
- Make sure `DISCORD_BOT_TOKEN` is set
- Verify bot has SERVER MEMBERS INTENT enabled
- Check bot is in your Discord server

### **Can't add log:**
- Ensure you're signed in
- Verify the war is still active
- Check all required fields are filled

### **Image not showing:**
- Use direct image URLs (ending in .jpg, .png, etc.)
- Imgur links should be direct (i.imgur.com/...)
- Avoid album or gallery links

---

## 📱 Mobile Support

The Faction Wars system is fully responsive:
- ✅ Mobile-friendly navigation
- ✅ Touch-optimized buttons
- ✅ Scrollable member selection
- ✅ Responsive grid layouts

---

## 🔮 Future Enhancements

Potential features to add:
- War leaderboards (most kills, most active)
- Export war logs to PDF
- War notifications via Discord webhook
- Kill/death ratio tracking
- Territory gained/lost tracking
- War timeline visualization

---

## 🎉 You're Ready!

The Faction Wars system is now fully integrated into your platform. Start tracking your conflicts and building your war history!

**Need help?** Check the API routes in `/app/api/wars/` for technical details.

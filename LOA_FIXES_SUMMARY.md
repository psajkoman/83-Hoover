# [LOA] Functionality Fixes Applied

## Issues Fixed

### 1. Missing Discord Bot Permission
**Problem**: The bot was missing the "Manage Nicknames" permission required to update member nicknames.

**Solution**: 
- Updated `DISCORD_BOT_SETUP.md` to include "Manage Nicknames" permission in the OAuth2 scope
- Added detailed section about [LOA] functionality requirements
- Added troubleshooting guide for [LOA] issues

### 2. Poor Error Handling and Logging
**Problem**: When [LOA] updates failed, there was minimal logging to diagnose issues.

**Solution**:
- Enhanced `updateDiscordNickname()` function with detailed error codes:
  - 10013: Insufficient permissions (needs "Manage Nicknames")
  - 10007: Member not found
  - 50001: Missing access
  - 50013: Cannot edit member with higher role
- Added comprehensive logging with `[LOA]` prefix in:
  - `/app/api/leaves/route.ts` (when adding [LOA])
  - `/app/api/leaves/[id]/end/route.ts` (when removing [LOA])
- Added database error handling for display name updates

### 3. No Testing Tools
**Problem**: No way to verify Discord bot configuration.

**Solution**: Created `test-discord-loa.js` script to:
- Check environment variables
- Test Discord API connection
- Verify bot is in the server
- Provide manual verification steps

## How the [LOA] System Works

### Adding [LOA] (Leave Submission)
1. User submits a leave request via `/api/leaves`
2. System checks if user has Discord ID
3. Gets current display name from database
4. If no [LOA] tag exists, adds it: `"Username [LOA]"`
5. Updates Discord nickname via API
6. Updates database display name
7. Sends Discord notification

### Removing [LOA] (Leave End)
1. User ends leave via `/api/leaves/[id]/end`
2. System checks if user has Discord ID
3. Gets current display name from database
4. If [LOA] tag exists, removes it
5. Updates Discord nickname via API
6. Updates database display name
7. Deletes Discord notification message

## Requirements for [LOA] to Work

### Discord Bot Setup
1. **Bot Token**: `DISCORD_BOT_TOKEN` environment variable
2. **Guild ID**: `DISCORD_GUILD_ID` environment variable
3. **Permissions**: Bot must have "Manage Nicknames" permission
4. **Role Hierarchy**: Bot role must be higher than all member roles

### Database Setup
1. Users table must have `display_name` column
2. Leaves table must have `requested_for_discord_id` column

### Environment Variables
```env
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_server_id_here
```

## Testing the Fix

1. **Verify Bot Permissions**:
   ```bash
   node test-discord-loa.js
   ```

2. **Manual Test**:
   - Submit a leave request for a user with Discord ID
   - Check logs for `[LOA]` prefixed messages
   - Verify user's nickname in Discord gets `[LOA]` tag
   - End the leave request
   - Verify `[LOA]` tag is removed

3. **Check Logs**:
   - Look for `[LOA]` prefixed log messages
   - Check for specific error codes if updates fail

## Common Issues and Solutions

### "Insufficient permissions" (Error 10013)
- **Cause**: Bot lacks "Manage Nicknames" permission
- **Fix**: Re-invite bot with "Manage Nicknames" permission

### "Cannot edit member with higher role" (Error 50013)
- **Cause**: Bot role is lower than target user's role
- **Fix**: Move bot role above all member roles in Discord server settings

### "Member not found" (Error 10007)
- **Cause**: User is not in the Discord server
- **Fix**: Ensure user is a member of the server

### Rate Limiting
- **Cause**: Too many nickname changes in short time
- **Fix**: Discord limits nickname changes to 2 per minute per user

## Files Modified

1. `DISCORD_BOT_SETUP.md` - Added permissions and troubleshooting
2. `lib/discord.ts` - Enhanced error handling in `updateDiscordNickname()`
3. `app/api/leaves/route.ts` - Added comprehensive logging for [LOA] addition
4. `app/api/leaves/[id]/end/route.ts` - Added comprehensive logging for [LOA] removal
5. `test-discord-loa.js` - New test script for verification

The [LOA] functionality should now work correctly with proper error handling and logging to diagnose any issues.

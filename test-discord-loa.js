// Test script to verify Discord bot permissions for [LOA] functionality
// Run this with: node test-discord-loa.js

const { updateDiscordNickname } = require('./lib/discord');

async function testDiscordLOA() {
  console.log('🧪 Testing Discord [LOA] functionality...\n');
  
  // Check environment variables
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  
  console.log('Environment Variables:');
  console.log(`✅ DISCORD_GUILD_ID: ${guildId ? 'SET' : 'MISSING'}`);
  console.log(`✅ DISCORD_BOT_TOKEN: ${botToken ? 'SET' : 'MISSING'}`);
  
  if (!guildId || !botToken) {
    console.log('\n❌ Missing required environment variables!');
    console.log('Please set DISCORD_GUILD_ID and DISCORD_BOT_TOKEN in your .env.local file');
    process.exit(1);
  }
  
  console.log('\n📋 Testing Discord API connection...');
  
  try {
    // Test bot permissions by fetching guild info
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.log(`❌ Failed to connect to Discord API: ${response.status} ${response.statusText}`);
      
      if (error.code) {
        switch (error.code) {
          case 50001:
            console.log('   → Missing access - bot may not be in the server');
            break;
          case 10013:
            console.log('   → Insufficient permissions');
            break;
          default:
            console.log(`   → Error code: ${error.code}`);
        }
      }
      process.exit(1);
    }
    
    const guild = await response.json();
    console.log(`✅ Successfully connected to guild: "${guild.name}"`);
    
    // Test bot permissions in the guild
    console.log('\n🔐 Checking bot permissions...');
    const botResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/@me`, {
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (botResponse.ok) {
      const botMember = await botResponse.json();
      console.log(`✅ Bot is in the server with role(s): ${botMember.roles?.length || 0}`);
      
      // Check if bot has necessary permissions
      // Note: We can't directly check permissions via API without calculating them
      console.log('\n⚠️  Manual verification required:');
      console.log('   1. Go to your Discord server');
      console.log('   2. Right-click the server → Server Settings → Roles');
      console.log('   3. Find your bot\'s role');
      console.log('   4. Ensure it has "Manage Nicknames" permission');
      console.log('   5. Ensure the bot\'s role is HIGHER than member roles');
    }
    
  } catch (error) {
    console.log('❌ Error testing Discord connection:', error.message);
    process.exit(1);
  }
  
  console.log('\n✅ Discord bot configuration test complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Ensure bot has "Manage Nicknames" permission');
  console.log('   2. Ensure bot role is higher than all member roles');
  console.log('   3. Test [LOA] functionality by submitting a leave request');
}

// Only run if this file is executed directly
if (require.main === module) {
  testDiscordLOA();
}

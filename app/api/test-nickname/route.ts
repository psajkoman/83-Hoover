import { NextResponse } from 'next/server';
import { updateDiscordNickname } from '@/lib/discord';

export async function GET() {
  try {
    // Replace 'YOUR_DISCORD_ID' with an actual Discord ID from your server
    const discordId = '515483139502505994';
    const nickname = 'Adam Bowen [LOA]';
    
    console.log(`Attempting to update nickname for ${discordId} to "${nickname}"`);
    const result = await updateDiscordNickname(discordId, nickname);
    
    return NextResponse.json({ 
      success: result,
      message: result 
        ? 'Nickname update was successful' 
        : 'Failed to update nickname. Check server logs for details.'
    });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

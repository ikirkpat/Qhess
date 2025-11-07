import { AdamChessIntegration } from './adamIntegration.js';
import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

async function playAdamsChessGame() {
  console.log('Starting Adam\'s Chess Game...');
  
  const gameCode = await new Promise((resolve) => {
    rl.question('Enter game code: ', (answer) => {
      resolve(answer.trim());
    });
  });
  
  rl.close();
  
  const integration = new AdamChessIntegration();
  
  try {
    await integration.startGame(gameCode);
    console.log(`Game ${gameCode} started! Listening for opponent moves...`);
  } catch (error) {
    console.error('Failed to start game:', error);
  }
}

playAdamsChessGame();
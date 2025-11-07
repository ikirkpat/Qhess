import { ChessAIClient } from './external_client.js';
import { AdamsChessDriver } from './AdamsChessDriver.js';
import { Chess } from 'chess.js';
import { AI } from './AI/AI.js';

class AdamChessIntegration {
  constructor() {
    this.client = new ChessAIClient();
    this.roomCode = null;
    this.chessBoard = new Chess();
    this.unsubscribe = null;
  }

  async startGame() {
    const { gameId, roomCode } = await this.client.createMultiplayerGame("AI", true);
    this.roomCode = roomCode;
    console.log(`Game ${gameId} (${roomCode}) created! Share room code: ${roomCode}`);
    
    // Wait for opponent to join
    await this.client.waitForGameStart(roomCode);
    
    // Make first move as white
    console.log('Making first move as white...');
    const ai = new AI();
    const chessDriver = new AdamsChessDriver('white', this.roomCode);
    await ai.promptTurn(chessDriver);
    
    this.displayBoard();
    this.listenForOpponentMoves();
  }

  listenForOpponentMoves() {
    this.unsubscribe = this.client.listenToMultiplayerGame(this.roomCode, (gameData) => {
      if (gameData.lastMove && gameData.currentTurn === 'white') {
        this.handleOpponentMove(gameData.lastMove);
      }
    });
  }

  async handleOpponentMove(lastMove) {
    // Apply opponent move to local board
    const moveResult = this.chessBoard.move({ from: lastMove.from, to: lastMove.to });
    
    console.log('\nOpponent moved from', lastMove.from, 'to', lastMove.to);
    if (moveResult.captured) {
      console.log('Captured:', moveResult.captured);
    }
    this.displayBoard();
    
    // Generate AI response - AdamsChessDriver will handle Firebase move
    await this.generateAIMove();
    
    this.displayBoard();
  }

  async generateAIMove() {
    const ai = new AI();
    const chessDriver = new AdamsChessDriver('black', this.roomCode);
    await ai.promptTurn(chessDriver);
    
    // Get the move that was made
    const moves = this.chessBoard.history({ verbose: true });
    return moves[moves.length - 1];
  }

  displayBoard() {
    console.log('\n' + this.chessBoard.ascii());
  }

  stopGame() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

export { AdamChessIntegration };
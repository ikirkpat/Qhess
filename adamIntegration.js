import { ChessAIClient } from './external_client.js';
import { AdamsChessDriver } from './AdamsChessDriver.js';
import { Chess } from 'chess.js';
import { AI } from './AI/AI.js';

class AdamChessIntegration {
  constructor() {
    this.client = new ChessAIClient();
    this.gameId = null;
    this.chessBoard = new Chess();
    this.unsubscribe = null;
  }

  async startGame(gameCode) {
    this.gameId = await this.client.joinGame(gameCode, "QhessApp");
    await this.client.startGame(this.gameId);
    this.listenForOpponentMoves();
  }

  listenForOpponentMoves() {
    this.unsubscribe = this.client.listenForAIMove(this.gameId, (gameData) => {
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
    
    // Generate AI response
    const aiMove = await this.generateAIMove();
    
    if (aiMove) {
      // Make AI move locally
      const aiMoveResult = this.chessBoard.move(aiMove);
      
      console.log('\nAI moved from', aiMoveResult.from, 'to', aiMoveResult.to);
      if (aiMoveResult.captured) {
        console.log('Captured:', aiMoveResult.captured);
      }
      
      // Send move to Firebase
      await this.client.makeMove(
        this.gameId, 
        aiMove.from, 
        aiMove.to, 
        this.chessBoard.fen()
      );
      
      this.displayBoard();
    }
  }

  async generateAIMove() {
    const ai = new AI();
    const chessDriver = new AdamsChessDriver('black', this.gameId);
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
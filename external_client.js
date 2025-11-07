import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, updateDoc, getDoc, onSnapshot, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { Chess } from 'chess.js';
const firebaseConfig = {
  apiKey: "AIzaSyCQQEKBMltwpT4k1lrc2lnrnhkbMltuNw8",
  authDomain: "chess-app-e13b7.firebaseapp.com",
  projectId: "chess-app-e13b7",
  storageBucket: "chess-app-e13b7.firebasestorage.app",
  messagingSenderId: "869597648759",
  appId: "1:869597648759:web:4655cda227581f404d7372"
};
export class ChessAIClient {
  constructor() {
    const app = initializeApp(firebaseConfig);
    this.db = getFirestore(app);
  }
  async createGame(playerName = "ExternalApp", aiColor = "black", difficulty = "master") {
    const roomCode = Array.from({ length: 6 }, () =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
    ).join('');
    const gameData = {
      whitePlayer: aiColor === 'black' ? playerName : 'AI',
      blackPlayer: aiColor === 'black' ? 'AI' : playerName,
      difficulty,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      currentTurn: 'white',
      status: 'active',
      roomCode,
      isPrivate: false,
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(this.db, 'games'), gameData);
    console.log(`Game created: ${docRef.id} (Room: ${roomCode})`);
    return docRef.id;
  }
  async makeMove(gameId, moveFrom, moveTo, newFen, promotion = null) {
    const gameDoc = await getDoc(doc(this.db, 'games', gameId));
    const game = gameDoc.data();
    const nextTurn = game.currentTurn === 'white' ? 'black' : 'white';
    await updateDoc(doc(this.db, 'games', gameId), {
      fen: newFen,
      currentTurn: nextTurn,
      lastMove: {
        from: moveFrom,
        to: moveTo,
        promotion
      }
    });
    console.log(`Move made: ${moveFrom} -> ${moveTo}`);
  }
  async getGameState(gameId) {
    const gameDoc = await getDoc(doc(this.db, 'games', gameId));
    return gameDoc.data();
  }
  async joinGame(roomCode, playerName) {
    console.log(`Searching for game with room code: ${roomCode}`);
    
    // First, get all multiplayer games to see what's available
    const allGamesRef = collection(this.db, 'multiplayerGames');
    const allGamesSnapshot = await getDocs(allGamesRef);
    console.log('\n=== ALL AVAILABLE MULTIPLAYER GAMES ===');
    allGamesSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`Game ID: ${doc.id}`);
      console.log(`Room Code: ${data.roomCode || data.code || 'N/A'}`);
      console.log(`White Player: ${data.whitePlayer || data.player1 || 'N/A'}`);
      console.log(`Black Player: ${data.blackPlayer || data.player2 || 'N/A'}`);
      console.log(`Status: ${data.status || 'N/A'}`);
      console.log('---');
    });
    console.log('=== END GAMES LIST ===\n');
    
    const gamesRef = collection(this.db, 'multiplayerGames');
    const q = query(gamesRef, where('roomCode', '==', roomCode));
    const snapshot = await getDocs(q);
    console.log(`Found ${snapshot.size} games`);
    if (snapshot.empty) {
      throw new Error(`Game not found with room code: ${roomCode}`);
    }
    const gameDoc = snapshot.docs[0];
    const gameData = gameDoc.data();
    if (gameData.blackPlayer === 'AI') {
      await updateDoc(doc(this.db, 'games', gameDoc.id), {
        blackPlayer: playerName,
        status: 'active'
      });
    } else if (gameData.whitePlayer === 'AI') {
      await updateDoc(doc(this.db, 'games', gameDoc.id), {
        whitePlayer: playerName,
        status: 'active'
      });
    }
    console.log(`Joined game: ${gameDoc.id}`);
    return gameDoc.id;
  }
  async startGame(gameId) {
    await updateDoc(doc(this.db, 'games', gameId), {
      status: 'active'
    });
    console.log('Game started');
  }
  listenForAIMove(gameId, callback) {
    return onSnapshot(doc(this.db, 'games', gameId), (doc) => {
      callback(doc.data());
    });
  }
}
// Example usage
async function example() {
  const client = new ChessAIClient();
  // Option 1: Create game (you play white, AI plays black at master level)
  const gameId = await client.createGame("MyApp", "black", "master");
  // Option 2: Join existing game by room code
  // const gameId = await client.joinGame("ABC123", "MyApp");
  // Make a move
  const board = new Chess();
  board.move('e4');
  await client.makeMove(gameId, "e2", "e4", board.fen());
  // Listen for AI response
  const unsubscribe = client.listenForAIMove(gameId, (gameData) => {
    if (gameData.currentTurn === 'white') {
      console.log('AI moved:', gameData.lastMove);
      console.log('New position:', gameData.fen);
    }
  });
  // Later: unsubscribe()
}
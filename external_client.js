import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc, updateDoc, getDoc, onSnapshot, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
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
  async createMultiplayerGame(playerName = "ExternalApp", playerEmail = "external@app.com", isPrivate = false, timeControl = 'none') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let roomCode = '';
    for (let i = 0; i < 6; i++) {
      roomCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const timeControls = {
      'none': 0,
      'blitz3': 180,
      'blitz5': 300,
      'rapid10': 600,
      'rapid15': 900,
      'classical30': 1800
    };
    const initialTime = timeControls[timeControl];
    const gameData = {
      roomCode,
      whitePlayer: playerName,
      whiteEmail: playerEmail,
      blackPlayer: null,
      blackEmail: null,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      moves: [],
      status: 'waiting',
      isPublic: !isPrivate,
      timeControl,
      whiteTime: initialTime,
      blackTime: initialTime,
      createdAt: serverTimestamp(),
      lastMove: serverTimestamp()
    };
    await setDoc(doc(this.db, 'multiplayerGames', roomCode), gameData);
    console.log(`Multiplayer game created: ${roomCode}`);
    return { gameId: roomCode, roomCode };
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
  async makeMoveMultiplayer(roomCode, newFen, moves, whiteTime = null, blackTime = null) {
    const update = {
      fen: newFen,
      moves: moves,
      lastMove: new Date()
    };
    if (whiteTime !== null) update.whiteTime = whiteTime;
    if (blackTime !== null) update.blackTime = blackTime;
    await updateDoc(doc(this.db, 'multiplayerGames', roomCode), update);
    console.log(`Move made in room ${roomCode}`);
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
  async joinGameById(gameId, playerName) {
    console.log(`Joining game: ${gameId}`);
    const gameDoc = await getDoc(doc(this.db, 'games', gameId));
    if (!gameDoc.exists()) {
      throw new Error(`Game not found: ${gameId}`);
    }
    const gameData = gameDoc.data();
    if (gameData.blackPlayer === 'AI') {
      await updateDoc(doc(this.db, 'games', gameId), {
        blackPlayer: playerName,
        status: 'active'
      });
    } else if (gameData.whitePlayer === 'AI') {
      await updateDoc(doc(this.db, 'games', gameId), {
        whitePlayer: playerName,
        status: 'active'
      });
    }
    console.log(`Joined game: ${gameId}`);
    return gameId;
  }
  async joinGame(roomCode, playerName) {
    console.log(`Searching for game with room code: ${roomCode}`);
    const gamesRef = collection(this.db, 'games');
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
  listenToMultiplayerGame(roomCode, callback) {
    return onSnapshot(doc(this.db, 'multiplayerGames', roomCode), (doc) => {
      if (doc.exists()) {
        callback(doc.data());
      }
    });
  }
  listenForAIMove(gameId, callback) {
    return onSnapshot(doc(this.db, 'games', gameId), (doc) => {
      callback(doc.data());
    });
  }
  
  async waitForGameStart(roomCode) {
    console.log('Waiting for opponent to join game...');
    return new Promise((resolve) => {
      const gamesRef = collection(this.db, 'multiplayerGames');
      const q = query(gamesRef, where('roomCode', '==', roomCode));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const gameData = snapshot.docs[0].data();
          console.log('Game status:', gameData.status);
          
          if (gameData.status === 'playing') {
            console.log('Game is now playing! Starting...');
            unsubscribe();
            resolve(gameData);
          }
        }
      });
    });
  }
}
// Example usage
async function example() {
  const client = new ChessAIClient();
  // MULTIPLAYER GAME (human vs human)
  const { gameId, roomCode } = await client.createMultiplayerGame("MyApp", "myapp@example.com", false, 'none');
  console.log(`Room code: ${roomCode}`);
  const board = new Chess();
  board.move('e4');
  await client.makeMoveMultiplayer(roomCode, board.fen(), board.history());
  const unsubscribe = client.listenToMultiplayerGame(roomCode, (gameData) => {
    console.log('Game updated:', gameData);
  });
  // AI GAME (human vs AI)
  // const aiGameId = await client.createGame("MyApp", "black", "master");
  // const board2 = new Chess();
  // board2.move('e4');
  // await client.makeMove(aiGameId, "e2", "e4", board2.fen());
  // const unsub2 = client.listenForAIMove(aiGameId, (gameData) => {
  //   console.log('AI moved:', gameData.lastMove);
  // });
  // Later: unsubscribe()
}
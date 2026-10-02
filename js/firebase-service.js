import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    collection, 
    query, 
    where, 
    getDocFromServer 
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Configuração oficial do Firebase provisionado
const firebaseConfig = {
  projectId: "gen-lang-client-0343306936",
  appId: "1:523911338874:web:3f197dc937e7754d3c54c3",
  apiKey: "AIzaSyAufqz0f5T_M1hympShcPVrOmgVBuGeSH0",
  authDomain: "gen-lang-client-0343306936.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-leituradiariacen-5263aa66-77c6-436a-9116-10900bfee681",
  storageBucket: "gen-lang-client-0343306936.firebasestorage.app",
  messagingSenderId: "523911338874"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Teste inicial de conexão
async function testConnection() {
    try {
        await getDocFromServer(doc(db, 'leituras_centrifugas', 'test_ping'));
        console.log("🔥 Conectado com sucesso ao Firebase Firestore!");
    } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
            console.warn("⚠️ Firebase em modo offline ou sem conexão:", error.message);
        } else {
            console.log("🔥 Firestore inicializado:", error?.message || 'OK');
        }
    }
}
testConnection();

// Salva leitura no Firestore (utiliza ID único baseado em data + horario + chiller)
export async function salvarLeituraFirestore(leitura) {
    const horarioClean = (leitura.horario || '').replace(':', '-');
    const docId = `${leitura.data}_${horarioClean}_${leitura.chiller}`;
    const docRef = doc(db, 'leituras_centrifugas', docId);
    
    // Converte valores nulos/vazios para manter documento limpo
    const dadosLimpos = {};
    for (const [chave, valor] of Object.entries(leitura)) {
        if (valor !== undefined && valor !== null && valor !== '') {
            dadosLimpos[chave] = valor;
        }
    }
    // Garante campos essenciais
    dadosLimpos.data = leitura.data;
    dadosLimpos.horario = leitura.horario;
    dadosLimpos.chiller = leitura.chiller;
    dadosLimpos.nome_operador = leitura.nome_operador;
    dadosLimpos.atualizadoEm = new Date().toISOString();

    await setDoc(docRef, dadosLimpos, { merge: true });
    return docId;
}

// Busca leituras por data e chiller no Firestore
export async function buscarLeiturasFirestore(dataBusca, chiller) {
    const collRef = collection(db, 'leituras_centrifugas');
    const q = query(
        collRef,
        where('data', '==', dataBusca),
        where('chiller', '==', chiller)
    );
    const snapshot = await getDocs(q);
    const leituras = [];
    snapshot.forEach(docSnap => {
        leituras.push({ id: docSnap.id, ...docSnap.data() });
    });
    leituras.sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));
    return leituras;
}

// Verifica se já existe leitura cadastrada
export async function verificarDuplicidadeFirestore(dataBusca, horario, chiller) {
    const horarioClean = (horario || '').replace(':', '-');
    const docId = `${dataBusca}_${horarioClean}_${chiller}`;
    const docRef = doc(db, 'leituras_centrifugas', docId);
    const snap = await getDoc(docRef);
    return snap.exists();
}

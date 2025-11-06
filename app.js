const firebaseConfig = {
  apiKey: "AIzaSyD0tU5mfngvpcFFtDN9yIJ3BaHdtRTIlQw",
  authDomain: "pokekinator.firebaseapp.com",
  databaseURL: "https://pokekinator-default-rtdb.firebaseio.com",
  projectId: "pokekinator",
  storageBucket: "pokekinator.firebasestorage.app",
  messagingSenderId: "316594301340",
  appId: "1:316594301340:web:6e0aeb220545427f990059"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
console.log("¡Firebase conectado y Firestore listo!");

// --- 2. FUNCIÓN AYUDANTE ---
/**
 * Convierte un string a formato Capitalizado (Ej: "pikachu" -> "Pikachu")
 */
function capitalizar(str) {
  if (!str) return "";
  str = str.trim().toLowerCase();
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// --- 3. ALMACÉN DE ELEMENTOS DEL DOM ---
// Guardaremos todos los elementos del DOM aquí para un acceso global
const elems = {};

// --- 4. ESTADO DEL JUEGO ---
// Guardaremos el estado actual del juego aquí
const gameState = {
  nodoActualId: "root",
  nodoActualData: null,
};

// --- 5. DEFINICIÓN DE FUNCIONES ---

/**
 * Muestra la vista de Juego y (re)inicia el juego
 */
function mostrarVistaJuego() {
  elems.vistaJuego.classList.add("activa");
  elems.vistaLista.classList.remove("activa");
  
  // Ocultamos todas las sub-vistas del juego
  elems.areaPregunta.style.display = "none";
  elems.areaRespuestas.style.display = "none";
  elems.areaAdivinanza.style.display = "none";
  elems.areaAprender.style.display = "none";

  // Reiniciamos y cargamos el juego
  gameState.nodoActualId = "root";
  cargarNodo(gameState.nodoActualId);
}

/**
 * Muestra la vista de Lista Y CARGA LOS DATOS de Firestore
 */
async function mostrarVistaLista() {
  elems.vistaLista.classList.add("activa");
  elems.vistaJuego.classList.remove("activa");

  elems.listaPokemonContainer.innerHTML = "<li>Cargando... 🌀</li>";

  try {
    const snapshot = await db.collection("pokemonList").orderBy("nombre").get(); // Ordenamos por nombre
    elems.listaPokemonContainer.innerHTML = ""; // Limpiamos "Cargando..."

    if (snapshot.empty) {
      elems.listaPokemonContainer.innerHTML =
        "<li>Aún no hay Pokémon aprendidos.</li>";
      return;
    }

    snapshot.forEach((doc) => {
      const pokemon = doc.data();
      const pokemonCard = document.createElement("div");
      pokemonCard.classList.add("pokemon-card");
      pokemonCard.innerHTML = `
          <img src="${pokemon.imageUrl}" alt="${pokemon.nombre}">
          <span>${pokemon.nombre}</span>
        `;
      elems.listaPokemonContainer.appendChild(pokemonCard);
    });
  } catch (error) {
    console.error("Error al cargar la lista de Pokémon: ", error);
    elems.listaPokemonContainer.innerHTML =
      "<li>Hubo un error al cargar la lista. 😕</li>";
  }
}

/**
 * Carga un nodo (pregunta o Pokémon) desde Firestore
 */
async function cargarNodo(idNodo) {
  console.log(`Cargando nodo: ${idNodo}`);
  try {
    const doc = await db.collection("gameTree").doc(idNodo).get();
    if (!doc.exists) {
      alert("¡Error en el juego! No se encontró el nodo. Volviendo al inicio.");
      return mostrarVistaJuego();
    }

    gameState.nodoActualData = doc.data();
    gameState.nodoActualId = doc.id;

    renderizarNodo(gameState.nodoActualData);
  } catch (error) {
    console.error("Error al cargar nodo: ", error);
  }
}

/**
 * Muestra la pregunta o la adivinanza en pantalla
 */
function renderizarNodo(data) {
  // Ocultamos todas las áreas primero
  elems.areaAdivinanza.style.display = "none";
  elems.areaAprender.style.display = "none";
  elems.areaPregunta.style.display = "none";
  elems.areaRespuestas.style.display = "none";
  elems.imgAdivinanza.style.display = "none";

  if (data.type === "question") {
    // Es una pregunta
    elems.textoPregunta.textContent = data.textoPregunta;
    elems.areaPregunta.style.display = "block";
    elems.areaRespuestas.style.display = "flex";
  } else if (data.type === "leaf") {
    // Es una adivinanza
    elems.textoAdivinanza.textContent = data.pokemonName;
    elems.imgAdivinanza.src = data.imageUrl || "https://via.placeholder.com/96";
    elems.imgAdivinanza.style.display = "block";
    elems.areaAdivinanza.style.display = "block"; // O 'flex' si se ajusta en CSS
  }
}

/**
 * Se activa al hacer clic en 'No, te equivocaste'
 */
function manejarErrorAdivinanza() {
  elems.areaAdivinanza.style.display = "none";
  elems.areaAprender.style.display = "block";
  elems.inputPokemon.value = "";
  elems.inputPregunta.value = "";
  elems.inputPokemon.focus(); // Damos foco al primer campo
}

/**
 * Se activa al enviar el formulario de aprendizaje
 */
async function aprenderNuevoPokemon(event) {
  event.preventDefault();
  const nuevoPokemonNombre = capitalizar(elems.inputPokemon.value);
  const nuevaPreguntaTexto = elems.inputPregunta.value.trim();

  if (!nuevoPokemonNombre || !nuevaPreguntaTexto) {
    return alert("Por favor, completa todos los campos.");
  }

  elems.areaAprender.style.display = "none";
  elems.areaPregunta.style.display = "block";
  elems.textoPregunta.textContent = "Consultando la Pokédex... 🌀";

  let nuevoPokemonImageUrl;
  try {
    const response = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${nuevoPokemonNombre.toLowerCase()}`
    );
    if (!response.ok) {
      throw new Error("Pokémon no encontrado en la Pokédex.");
    }
    const data = await response.json();
    nuevoPokemonImageUrl = data.sprites.front_default;
    if (!nuevoPokemonImageUrl) {
      nuevoPokemonImageUrl = "https://via.placeholder.com/96"; // Placeholder
    }
  } catch (error) {
    console.error("Error con PokéAPI:", error.message);
    alert(
      `Error: ${error.message}. No se pudo aprender. ¿Escribiste bien el nombre?`
    );
    return mostrarVistaJuego();
  }

  elems.textoPregunta.textContent = "Aprendiendo... 🧠";

  const pokemonViejoNombre = gameState.nodoActualData.pokemonName;
  const pokemonViejoImageUrl =
    gameState.nodoActualData.imageUrl || "https://via.placeholder.com/96";

  const nuevaHojaPokemonNuevo = {
    type: "leaf",
    pokemonName: nuevoPokemonNombre,
    imageUrl: nuevoPokemonImageUrl,
  };
  const nuevaHojaPokemonViejo = {
    type: "leaf",
    pokemonName: pokemonViejoNombre,
    imageUrl: pokemonViejoImageUrl,
  };

  const batch = db.batch();

  // 1. Añadir a pokemonList
  const listaRef = db.collection("pokemonList").doc();
  batch.set(listaRef, {
    nombre: nuevoPokemonNombre,
    imageUrl: nuevoPokemonImageUrl,
  });

  // 2. Crear las dos nuevas hojas en gameTree
  const hojaNuevaRef = db.collection("gameTree").doc();
  batch.set(hojaNuevaRef, nuevaHojaPokemonNuevo);
  const hojaViejaRef = db.collection("gameTree").doc();
  batch.set(hojaViejaRef, nuevaHojaPokemonViejo);

  // 3. Actualizar el nodo actual para que sea una pregunta
  const nodoActualRef = db.collection("gameTree").doc(gameState.nodoActualId);
  batch.update(nodoActualRef, {
    type: "question",
    textoPregunta: nuevaPreguntaTexto,
    pokemonName: firebase.firestore.FieldValue.delete(),
    imageUrl: firebase.firestore.FieldValue.delete(),
    yesNode: hojaNuevaRef.id,
    noNode: hojaViejaRef.id,
  });

  // 4. Ejecutar todo
  try {
    await batch.commit();
    console.log("¡El árbol se actualizó correctamente!");
    alert(`¡Genial! ¡He aprendido sobre ${nuevoPokemonNombre}!`);
    mostrarVistaJuego();
  } catch (error) {
    console.error("Error al actualizar el árbol: ", error);
    alert("Hubo un error al intentar aprender. Por favor, inténtalo de nuevo.");
  }
}

/**
 * Se activa al hacer clic en '¡Sí, adivinaste!'
 */
function manejarAcierto() {
  alert("¡Lo sabía! 😎");
  mostrarVistaJuego(); // Reinicia el juego
}

/**
 * Se activa al responder Sí o No a una pregunta
 */
function manejarRespuesta(respuesta) {
  if (!gameState.nodoActualData || gameState.nodoActualData.type !== "question")
    return;

  const proximoNodoId =
    respuesta === "si"
      ? gameState.nodoActualData.yesNode
      : gameState.nodoActualData.noNode;
  cargarNodo(proximoNodoId);
}

// --- 6. INICIALIZACIÓN DE LA APLICACIÓN ---
/**
 * Se ejecuta cuando el DOM está listo.
 * Selecciona los elementos y asigna los 'event listeners'.
 */
function init() {
  // 1. Seleccionar elementos y guardarlos
  elems.btnJugar = document.getElementById("btnJugar");
  elems.btnLista = document.getElementById("btnLista");
  elems.vistaJuego = document.getElementById("vistaJuego");
  elems.vistaLista = document.getElementById("vistaLista");
  elems.listaPokemonContainer = document.getElementById("listaPokemon");
  elems.areaPregunta = document.getElementById("areaPregunta");
  elems.textoPregunta = document.querySelector("#areaPregunta .pregunta");
  elems.areaRespuestas = document.getElementById("areaRespuestas");
  elems.btnSi = document.querySelector("#areaRespuestas button:nth-child(1)");
  elems.btnNo = document.querySelector("#areaRespuestas button:nth-child(2)");
  elems.areaAdivinanza = document.getElementById("areaAdivinanza");
  elems.textoAdivinanza = document.querySelector(
    "#areaAdivinanza .pregunta strong"
  );
  elems.btnAdivinanzaSi = document.getElementById("btnAdivinanzaSi");
  elems.btnAdivinanzaNo = document.getElementById("btnAdivinanzaNo");
  elems.imgAdivinanza = document.getElementById("imgAdivinanza");
  elems.areaAprender = document.getElementById("areaAprender");
  elems.formAprender = document.getElementById("formAprender");
  elems.inputPokemon = document.getElementById("inputPokemon");
  elems.inputPregunta = document.getElementById("inputPregunta");
  elems.btnCancelarAprender = document.getElementById("btnCancelarAprender");

  // 2. Asignar 'event listeners'
  elems.btnJugar.addEventListener("click", mostrarVistaJuego);
  elems.btnLista.addEventListener("click", mostrarVistaLista);
  
  elems.btnAdivinanzaSi.addEventListener("click", manejarAcierto);
  elems.btnAdivinanzaNo.addEventListener("click", manejarErrorAdivinanza);
  
  elems.formAprender.addEventListener("submit", aprenderNuevoPokemon);
  elems.btnCancelarAprender.addEventListener("click", mostrarVistaJuego);
  
  elems.btnSi.addEventListener("click", () => manejarRespuesta("si"));
  elems.btnNo.addEventListener("click", () => manejarRespuesta("no"));

  // 3. Carga inicial
  mostrarVistaJuego();
}

// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", init);
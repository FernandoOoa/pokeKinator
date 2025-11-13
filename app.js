// ===== CONFIGURACIÓN DE FIREBASE =====
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

// ===== FUNCIÓN AYUDANTE =====
function capitalizar(str) {
  if (!str) return "";
  str = str.trim().toLowerCase();
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ===== ELEMENTOS DEL DOM =====
const elems = {};

// ===== ESTADO DEL JUEGO =====
const gameState = {
  nodoActualId: "root",
  nodoActualData: null,
};

// ===== FUNCIONES PRINCIPALES =====
function mostrarVistaJuego() {
  elems.vistaJuego.classList.add("activa");
  elems.vistaLista.classList.remove("activa");
  elems.areaPregunta.style.display = "none";
  elems.areaRespuestas.style.display = "none";
  elems.areaAdivinanza.style.display = "none";
  elems.areaAprender.style.display = "none";
  gameState.nodoActualId = "root";
  cargarNodo(gameState.nodoActualId);
}

async function mostrarVistaLista() {
  elems.vistaLista.classList.add("activa");
  elems.vistaJuego.classList.remove("activa");
  elems.listaPokemonContainer.innerHTML = "<li>Cargando... 🌀</li>";

  try {
    const snapshot = await db.collection("pokemonList").orderBy("nombre").get();
    elems.listaPokemonContainer.innerHTML = "";
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
      pokemonCard.addEventListener("click", () =>
        mostrarRutaPokemon(pokemon.nombre)
      );
      elems.listaPokemonContainer.appendChild(pokemonCard);
    });
  } catch (error) {
    console.error("Error al cargar la lista de Pokémon: ", error);
    elems.listaPokemonContainer.innerHTML =
      "<li>Hubo un error al cargar la lista. 😕</li>";
  }
}

async function mostrarRutaPokemon(pokemonNombre) {
  elems.modalTitulo.textContent = `Buscando camino a ${pokemonNombre}...`;
  elems.modalListaRuta.innerHTML = "<li>Buscando... 🌀</li>";
  elems.modalRuta.style.display = "block";

  let path = [];
  let currentNodeId = null;

  try {
    const leafQuery = await db.collection("gameTree")
      .where("type", "==", "leaf")
      .where("pokemonName", "==", pokemonNombre)
      .get();

    if (leafQuery.empty) {
      throw new Error("No se encontró la hoja de este Pokémon en el árbol.");
    }

    currentNodeId = leafQuery.docs[0].id;

    while (currentNodeId !== "root") {
      let parentQuery;
      let answer;

      parentQuery = await db.collection("gameTree")
        .where("yesNode", "==", currentNodeId)
        .get();

      if (!parentQuery.empty) {
        answer = "Sí";
      } else {
        parentQuery = await db.collection("gameTree")
          .where("noNode", "==", currentNodeId)
          .get();
        if (!parentQuery.empty) {
          answer = "No";
        } else {
          throw new Error("No se pudo encontrar el nodo padre.");
        }
      }

      const parentDoc = parentQuery.docs[0];
      path.push({
        question: parentDoc.data().textoPregunta,
        answer: answer,
      });
      currentNodeId = parentDoc.id;
    }

    path.reverse();

    elems.modalTitulo.textContent = `Camino a ${pokemonNombre}`;
    if (path.length === 0) {
      elems.modalListaRuta.innerHTML = "<li>Es el Pokémon raíz. No hay preguntas.</li>";
    } else {
      elems.modalListaRuta.innerHTML = path
        .map(
          (step) =>
            `<li>${step.question} <strong>Respuesta: ${step.answer}</strong></li>`
        )
        .join("");
    }
  } catch (error) {
    console.error("Error al buscar la ruta:", error);
    elems.modalTitulo.textContent = "Error";
    elems.modalListaRuta.innerHTML = `<li>${error.message}</li>`;
  }
}

// ===== FUNCIONES DE NAVEGACIÓN DEL ÁRBOL =====
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

function renderizarNodo(data) {
  elems.areaAdivinanza.style.display = "none";
  elems.areaAprender.style.display = "none";
  elems.areaPregunta.style.display = "none";
  elems.areaRespuestas.style.display = "none";
  elems.imgAdivinanza.style.display = "none";

  if (data.type === "question") {
    elems.textoPregunta.textContent = data.textoPregunta;
    elems.areaPregunta.style.display = "block";
    elems.areaRespuestas.style.display = "flex";
  } else if (data.type === "leaf") {
    elems.textoAdivinanza.textContent = data.pokemonName;
    elems.imgAdivinanza.src = data.imageUrl || "https://via.placeholder.com/96";
    elems.imgAdivinanza.style.display = "block";
    elems.areaAdivinanza.style.display = "block";
  }
}

// ===== FUNCIONES DE APRENDIZAJE =====
function manejarErrorAdivinanza() {
  elems.areaAdivinanza.style.display = "none";
  elems.areaAprender.style.display = "block";
  elems.inputPokemon.value = "";
  elems.inputPregunta.value = "";
  elems.inputPokemon.focus();
}

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
    nuevoPokemonImageUrl =
      data.sprites.front_default || "https://via.placeholder.com/96";
  } catch (error) {
    console.error("Error con PokéAPI:", error.message);
    alert(
      `Error: ${error.message}. No se pudo aprender. ¿Escribiste bien el nombre?`
    );
    return mostrarVistaJuego();
  }

  let yaExisteEnLaLista = false;
  try {
    const listaQuery = await db.collection("pokemonList")
      .where("nombre", "==", nuevoPokemonNombre)
      .get();
    yaExisteEnLaLista = !listaQuery.empty;
  } catch (e) {
    console.error("Error al comprobar duplicados: ", e);
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

  if (!yaExisteEnLaLista) {
    const listaRef = db.collection("pokemonList").doc();
    batch.set(listaRef, {
      nombre: nuevoPokemonNombre,
      imageUrl: nuevoPokemonImageUrl,
    });
    console.log(`Añadiendo ${nuevoPokemonNombre} a la lista.`);
  } else {
    console.log(`${nuevoPokemonNombre} ya existe en la lista, no se añade.`);
  }

  const hojaNuevaRef = db.collection("gameTree").doc();
  batch.set(hojaNuevaRef, nuevaHojaPokemonNuevo);
  const hojaViejaRef = db.collection("gameTree").doc();
  batch.set(hojaViejaRef, nuevaHojaPokemonViejo);

  const nodoActualRef = db.collection("gameTree").doc(gameState.nodoActualId);
  batch.update(nodoActualRef, {
    type: "question",
    textoPregunta: nuevaPreguntaTexto,
    pokemonName: firebase.firestore.FieldValue.delete(),
    imageUrl: firebase.firestore.FieldValue.delete(),
    yesNode: hojaNuevaRef.id,
    noNode: hojaViejaRef.id,
  });

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

// ===== FUNCIONES DE RESPUESTA =====
function manejarAcierto() {
  alert("¡Lo sabía! 😎");
  mostrarVistaJuego();
}

function manejarRespuesta(respuesta) {
  if (!gameState.nodoActualData || gameState.nodoActualData.type !== "question")
    return;
  const proximoNodoId =
    respuesta === "si"
      ? gameState.nodoActualData.yesNode
      : gameState.nodoActualData.noNode;
  cargarNodo(proximoNodoId);
}

// ===== INICIALIZACIÓN =====
function init() {
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
  elems.textoAdivinanza = document.querySelector("#areaAdivinanza .pregunta strong");
  elems.btnAdivinanzaSi = document.getElementById("btnAdivinanzaSi");
  elems.btnAdivinanzaNo = document.getElementById("btnAdivinanzaNo");
  elems.imgAdivinanza = document.getElementById("imgAdivinanza");
  elems.areaAprender = document.getElementById("areaAprender");
  elems.formAprender = document.getElementById("formAprender");
  elems.inputPokemon = document.getElementById("inputPokemon");
  elems.inputPregunta = document.getElementById("inputPregunta");
  elems.btnCancelarAprender = document.getElementById("btnCancelarAprender");
  elems.modalRuta = document.getElementById("modalRuta");
  elems.btnCerrarModal = document.getElementById("btnCerrarModal");
  elems.modalTitulo = document.getElementById("modalTitulo");
  elems.modalListaRuta = document.getElementById("modalListaRuta");

  elems.btnJugar.addEventListener("click", mostrarVistaJuego);
  elems.btnLista.addEventListener("click", mostrarVistaLista);
  elems.btnAdivinanzaSi.addEventListener("click", manejarAcierto);
  elems.btnAdivinanzaNo.addEventListener("click", manejarErrorAdivinanza);
  elems.formAprender.addEventListener("submit", aprenderNuevoPokemon);
  elems.btnCancelarAprender.addEventListener("click", mostrarVistaJuego);
  elems.btnSi.addEventListener("click", () => manejarRespuesta("si"));
  elems.btnNo.addEventListener("click", () => manejarRespuesta("no"));

  const cerrarModal = () => { elems.modalRuta.style.display = "none"; };
  elems.btnCerrarModal.addEventListener("click", cerrarModal);
  elems.modalRuta.addEventListener("click", (event) => {
    if (event.target === elems.modalRuta) {
      cerrarModal();
    }
  });

  mostrarVistaJuego();
}

document.addEventListener("DOMContentLoaded", init);

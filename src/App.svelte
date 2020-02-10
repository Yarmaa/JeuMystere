<script>
	const mots = ["banane","caca", "sushi", "café", "parapluie", "riz", "drapeau", "horloge", "doigt", "nuage", "montagne"];
	const indices = ["🍌", "💩", "🍣", "🍵", "☔", "🍚", "🏴", "⏲", "☝", "☁", "🏔"];
	let gagne = false;
	let perdu = false;
	let reponse;
	let mort = false;
	let idRandom,
		id;
	
	$:vies = 3;
	$: points = 0;
	aleatoire();
	$: mot = mots[id];
	$: indice = indices[id];
	
	function validation () {
		reponse = reponse.toLowerCase();
		if (reponse === mot) {
			gagne = true;
			perdu = false;
		} else {
			gagne = false;
			perdu = true;
			nettoyer();
			vies = vies - 1;
			if (vies === 0) {
				mort = true;
			}
		}
	}

	function recommencer () {
		points = 0;
		mort = false;
		vies = 3;
		gagne = false;
		perdu = false;
		aleatoire();
	}

	function continuer() {
		points += 1;
		gagne = false;
		perdu = false;
		aleatoire();
	}

	function aleatoire() {
		idRandom = Math.random() * (mots.length- 0) + 0;
		id = Math.round(idRandom);
	}

	function nettoyer () {
		document.querySelector('input').value = "";
	}


</script>

<h1>Le grand jeu du MOT MYSTERE</h1>
{#if mort === false}
	<p>L'indice est ... {indice}</p>
	<p>Nombres de coups restant ... <span style="color: rgb(204, 65, 65)">{vies}</span> </p>
	<p>Nomres de points gagné ... {points} </p>
	<p><span>Alors quel est le mot mystere ?</span><input type="text" placeholder="Mot mystère" bind:value={reponse}><button on:click={nettoyer} on:click={validation} >OK</button></p>
{/if}
{#if gagne}
	<p>🎉🎉🎉🎉 BRAVO !!!! 🎉🎉🎉🎉🎉  <button on:click={continuer}> Un autre mot !</button></p>
	
{/if}

{#if perdu}
	<p>Ce n'est pas le mot mystère ... 😢</p>
{/if}

{#if mort}
	<p>La partie s'arrete ici ... 💀   <button on:click={recommencer}>Recommencer ?</button></p>
{/if}

<style>
	h1, p {
		text-align: center;
		color: blueviolet;
		font-weight: bold;
	}

	p {
		font-size: 1.5em;
		color: black;
	}

	input {
		margin: 15px;
		padding: 10px;
	}

	span {
		font-size: 1em;
	}
</style>
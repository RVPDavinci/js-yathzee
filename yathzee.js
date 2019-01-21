var rollBtn = document.getElementById("roll");
var scorePosibilities = [];
var dice = [];
var rolls = 0;
var autoClick = false;

start();

function roll() {
    rolls++;
    rollBtn.innerHTML = (rolls === 1? 'First' : 'Second') + " reroll";
    rollBtn.style.display = "none";

    if(rolls > 1) {
        unsetPosibilities();
        pickupDice(rollDice);
    }else{
        rollDice();
    }
}

function pickupDice(callback) {
    rollBtn.style.display = "none";

    var max = setAnimationVariables([3,7,-0.3], [-6,3,1.2]);

    modifyAllDiceElements(function (dice) {
        dice.classList.add("pickup");
    });

    setTimeout(function () {
        rollBtn.style.display = "inline-block";
        callback();
    }, max[1]*1000);
}

function rollDice() {
    rollBtn.style.display = "none";

    modifyAllDiceElements(function (dice) {
        dice.classList.remove("pickup");
        dice.classList.add("roll");
        dice.style.display = 'inline';
        dice.onclick = "";
    });

    setAnimationVariables([1,9,0], [-8,5,2]);

    var internalCallback = function (tick, counter) {
        return function () {
            if (--tick >= 0) {
                setTimeout(internalCallback, ++counter * 20);
                modifyAllDiceElements(function(dice){
                    var roll = getRandomNumberBetween(1, 6);
                    dice.setAttribute("rel", roll);
                    dice.style.backgroundPositionX = (-100 * (roll - 1)) + "px";
                });
            } else {
                modifyAllDiceElements(function(dice){
                    dice.onclick = lockDice;
                    dice.classList.remove("roll");
                });

                if (rolls === 3) {
                    scoreDice();
                } else {
                    rollBtn.style.display = "inline";
                    setScorePosibilities(true);
                }
            }
        }
    }(17, 0);

    internalCallback();
}

function setAnimationVariables(delaySettings, durationsSettings) {
    var delays = modifyAllDiceElements(function(dice){
        var delay = delaySettings[2]+(getRandomNumberBetween(delaySettings[0], delaySettings[1]) * 0.1);
        dice.style.animationDelay = delay + 's';
        dice.style.webkitAnimationDelay = delay + 's';
        return delay;
    });

    var durations =  modifyAllDiceElements(function(dice){
        var duration = durationsSettings[2]+(getRandomNumberBetween(durationsSettings[0], durationsSettings[1]) * 0.1);
        dice.style.animationDuration = duration + 's';
        dice.style.webkitAnimationDuration = duration + 's';
        return duration;
    });

    return [Math.max(...delays), Math.max(...durations)];
}

function scoreDice() {
    rolls = 3;

    for (var i = 0; i < dice.length; i++) {
        lockDice(i);
    }

    rollBtn.style.display = "none";
    rollBtn.onclick = nextRoll;

    setScorePosibilities(true);
    var keys = Object.keys(scorePosibilities);

    if(keys.length === 0) {
        setScorePosibilities('-');
        keys = Object.keys(scorePosibilities);

        if(keys > 1){
            alert('Geen keuze meer, je moet iets wegstrepen');
        }
    }

    if(keys.length === 1){
        var data = getDataById(keys[0]);
        var alertText = 'Er is 1 keuze ('+data[0]+'), deze is automatisch voor je ';

        if(data[1] === '-'){
            alertText += ' weg gestreept';
        }else{
            alertText += 'ingevuld ('+data[1]+' punten)';
        }

        alert(alertText);
        autoClick = true;
        data[2].click();
    }
}

function getValidations(numbers) {
    var score = numbers.reduce((a, b) => a + b, 0);

    var data = getDataById("yathzee");
    var yathzeeScore = isNumeric(data[1]) ? (parseInt(data[1])+100) : 50;

    var validations = {
        "yathzee": [function(numbers){
            var occurences = getOccurences(numbers);
            if (occurences.indexOf(5) > -1){
                var data = getDataById("yathzee");
                if(isNumeric(data[1])) {
                    return "Je hebt al " + data[0] + ", wil je deze ophogen met 100 puntent? dan moet je ook iets wegstrepen.";
                }else{
                    return true;
                }
            }

            return false;
        },yathzeeScore, false],
        "str_big" : [function (numbers) {
            var longestStraight = getLongestStraight(numbers);
            return (longestStraight === 5);
        },40,true],
        "str_small" : [function (numbers) {
            var longestStraight = getLongestStraight(numbers);
            return (longestStraight >= 4);
        },30,true],
        "fullhouse" : [function (numbers) {
            var occurences = getOccurences(numbers);
            return (occurences.indexOf(3) > -1 && occurences.indexOf(2) > -1)
        },25,true],
        "kind_4" : [function (numbers) {
            var occurences = getOccurences(numbers);
            return (occurences.indexOf(4) > -1 || occurences.indexOf(5) > -1);
        },score,true],
        "2_pair" : [function (numbers) {
            var occurences = getOccurences(numbers);
            var combos = getOccurences(occurences);
            return (combos[2] === 2);
        },score,true],
        "kind_3" : [function (numbers) {
            var occurences = getOccurences(numbers);
            return (occurences.indexOf(3) > -1 || occurences.indexOf(4) > -1 || occurences.indexOf(5) > -1);
        },score,true],
        "chance" : [function () {
            return true;
        },score,true]
    };


    var occurences = getOccurences(numbers);
    for(var i = 1; i <= 6; i++){
        validations["top_"+i] = [function (numbers, key) {
            var number = parseInt(key.replace("top_",""));
            var uniqueArray = getUniqueArray(numbers);
            return (uniqueArray.indexOf(number) > -1);
        },(occurences[i]*i),true];
    }

    return validations;
}

function setScorePosibilities(setScore) {
    unsetPosibilities();
    var numbers = [];

    for (var i = 0; i < dice.length; i++) {
        var value = isNumeric(dice[i]) ? dice[i] : parseInt(dice[i].getAttribute("rel"));
        numbers.push(value);
    }

    var validations = getValidations(numbers);

    for (var key in validations) {
        var validationResult = validations[key][0](numbers, key);
        if (validationResult || setScore !== true) {
            var data = getDataById(key);
            if (data[1].length === 0 || (validations[key][2] === false && setScore === true)) {
                data[2].classList.add('posibility');
                var points = null;

                if (setScore === true) {
                    points = validations[key][1];
                } else if (setScore !== false) {
                    points = setScore;
                }

                var confirmText = 'Weet je zeker dat je ' + points + ' bij ' + data[0] + ' wilt invullen?';
                var strike = false;

                if (!isNumeric(points)) {
                    confirmText = 'Weet je zeker dat je ' + data[0] + ' wilt afstrepen?';
                } else if(validationResult !== true) {
                    confirmText = validationResult;
                    strike = true;
                }

                scorePosibilities[key] = [data[1], confirmText, strike];
                data[2].onclick = chooseScore;
                data[2].innerHTML = points;
            }
        }
    }
}


function lockDice(index) {
    if(!isNumeric(index)) {
        index = parseInt(this.id.replace("dice", "")) - 1;
    }

    if(!isNumeric(dice[index])){
        dice[index].onclick = null;
        dice[index].classList.add("locked");
        dice[index].classList.remove("roll");

        if(rolls < 3) {
            dice[index].onclick = unlockDice;
        }

        dice[index] = parseInt(dice[index].getAttribute("rel"));
    }
}

function unlockDice() {
    if(rolls < 3) {
        var index = parseInt(this.id.replace("dice", "")) - 1;
        dice[index] = this;
        dice[index].classList.remove("locked");
        dice[index].onclick = lockDice;
    }
}

function init() {
    rolls = 0;
    scorePosibilities = [];
    dice = [
        document.getElementById("dice1"),
        document.getElementById("dice2"),
        document.getElementById("dice3"),
        document.getElementById("dice4"),
        document.getElementById("dice5")
    ];

    rollBtn.style.display = "inline-block";
    rollBtn.onclick = roll;
}

function nextRoll() {
    init();
    modifyAllDiceElements(function(dice){
        dice.classList.remove("locked");
    });

    pickupDice(roll);
}

function start() {
    init();
    modifyAllDiceElements(function(dice){
        dice.style.display = 'none';
    });

    rollBtn.onclick = function () {
        document.getElementById("rolled").style.display = "block";
        rollBtn.classList.remove("first");
        roll();
    };

    document.getElementById("rolled").style.display = "none";
    rollBtn.innerHTML = "Play Yathzee!";
    rollBtn.classList.add("first");
}

function getRandomNumberBetween(start, stop) {
    return Math.floor(Math.random() * (stop-start+1)) + start;
}

function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function modifyAllDiceElements(callback) {
    var output = [];
    for (var i = 0; i < dice.length; i++) {
        if (!isNumeric(dice[i])) {
            output.push(callback(dice[i]));
        }
    }
    return output;
}

function getOccurences(array){
    var occurences = [];

    for (var i=0; i < array.length; i++){
        occurences[array[i]] = occurences[array[i]] ? occurences[array[i]] + 1 : 1;
    }

    return occurences;
}

function getUniqueArray(array) {
    return array.filter((el, i, a) => i === a.indexOf(el));
}

function getLongestStraight(array) {
    var uniquearray = getUniqueArray(array);
    uniquearray.sort();

    var longestStraight = 1;
    var currentStraigth = 1;
    var lastValue = uniquearray[0];

    for(var i =1; i < uniquearray.length; i++){
        var nextPlusOne = (uniquearray[i] === (lastValue+1));

        if(nextPlusOne){
            currentStraigth++;
        }

        if(currentStraigth > longestStraight){
            longestStraight = currentStraigth;
        }

        if(!nextPlusOne){
            currentStraigth = 1;
        }

        lastValue = uniquearray[i];
    }

    return longestStraight;
}

function getDataById(id) {
    var element = document.getElementById(id);
    return [
        element.previousElementSibling.previousElementSibling.innerHTML,
        element.innerHTML.trim(),
        element
    ];
}

function chooseScore() {
    var confirmText = scorePosibilities[this.id][1];

    if(autoClick === true || confirm(confirmText)){
        this.classList.add('chosen');
        scorePosibilities[this.id][0] = this.innerHTML;

        if(scorePosibilities[this.id][2]){
            unsetPosibilities();
            setScorePosibilities('-');
            return;
        }

        unsetPosibilities();

        if(calculateScore()){
            pickupDice(function () {
                rollBtn.innerHTML = 'Play agian';
                rollBtn.onclick = function () {
                    location.reload(true);
                }
            });
        }else{
            nextRoll();
        }

        autoClick = false;
    }
}

function unsetPosibilities() {
    for(var key in scorePosibilities){
        var element = document.getElementById(key);
        element.innerHTML = scorePosibilities[key][0];
        element.classList.remove('posibility');
        element.onclick = null;
    }

    scorePosibilities = [];
}

function calculateScore() {
    var chosen = document.getElementsByClassName("chosen");
    var subtotal = {"top_subtotal": [0,0,6], "bottom_subtotal" : [0,0,8]};
    var full = 0;

    for(var i=0; i<chosen.length; i++){
        var value = isNumeric(chosen[i].innerHTML) ? parseInt(chosen[i].innerHTML) : 0;
        var scoreKey = (chosen[i].id.search('top') > -1) ? "top_subtotal" : "bottom_subtotal";

        subtotal[scoreKey][0]++;
        subtotal[scoreKey][1] += value;
    }

    for(var key in subtotal){
        if(subtotal[key][1] > 0) {
            var element =  document.getElementById(key);

            if(subtotal[key][0] === subtotal[key][2]){
                full++;
                element.classList.add("full");

                if(key ===  "top_subtotal" && subtotal[key][1] >= 63){
                    bonus = 35;
                }
            }

            element.innerHTML = subtotal[key][1];
        }
    }


    var bonus = 0;
    if(subtotal["top_subtotal"][1] >= 63){
        bonus = 35;
        document.getElementById("bonus").classList.add("full");
    }else if(subtotal["top_subtotal"][0] === subtotal["top_subtotal"][2]){
        document.getElementById("bonus").classList.add("full");
    }

    document.getElementById("bonus").innerHTML = bonus;

    var topScore = subtotal["top_subtotal"][1]+bonus;
    document.getElementById("top_total").innerHTML = topScore;

    if(subtotal["top_subtotal"][0] === subtotal["top_subtotal"][2]){
        document.getElementById("bonus").classList.add("full");
        document.getElementById("top_total").classList.add("full");
    }

    document.getElementById("grand_total").innerHTML = subtotal["bottom_subtotal"][1]+topScore;

    return (full === 2);
}
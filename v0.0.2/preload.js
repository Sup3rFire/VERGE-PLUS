// VERGE

// Config
const VERSION = "0.0.2";
const PLATFORM = "desktop";

const glicko2 = require("glicko2-lite");

const cache = new Map();

// Some useful functions
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function getData(req) {
  const url = "https://ch.tetr.io/api/";
  const timeoutDelay = 1000;
  try {
    let cacheData = cache.get(req);
    if (!!cacheData) {
      cacheData = await Promise.resolve(cacheData);
      if (cacheData.success && new Date().getTime() < cacheData.cache.cached_until)
        return cacheData;
    }
    let data = fetch(url + req).then((res) => res.json());

    cache.set(req, data);

    return data;
  } catch (error) {
    console.log("Retrying request in " + timeoutDelay + "ms.");
    await delay(timeoutDelay);
    return await getData(req);
  }
}
function stringify(json) {
  let data = JSON.stringify(json);
  return data.replace(/"/g, "");
}

function calculatePercentile(value, array) {
  for (let i = 0; i < array.length; i++) {
    if (value < array[i]) {
      return (100 * i) / array.length;
    }
  }
  return 100;
}

// We breaching the mainframe with this one 🔥🔥🔥
// console.log("Injected Verge sucessfully");

function glickoToTR(glicko, rd) {
  let divisor =
    1 +
    Math.pow(
      10,
      ((1500 - glicko) * Math.PI) /
        Math.sqrt(
          3 * Math.LN10 * Math.LN10 * rd * rd +
            2500 * (64 * Math.PI * Math.PI + 147 * Math.LN10 * Math.LN10)
        )
    );
  return 25000 / divisor;
}

window.addEventListener("load", async function () {
  const dialogsNode = document.getElementById("dialogs");
  const config = { attributes: true, childList: true, subtree: true };

  async function checkUpdate() {
    const updateURL = "https://raw.githubusercontent.com/MrMeCoding/TETR-VERGE/main/version";
    let data = await (await fetch(updateURL)).json();
    return data;
  }
  let updateData = await checkUpdate();

  // This detects when the user opens someone's profile
  let dialogsObserver = new MutationObserver((mutations) => {
    // Only trigger if the dialogs div is empty
    if (document.getElementsByClassName("tetra_tag_holder").length != 1) {
      return;
    }

    let usernameNode;

    //// console.log(mutations);
    for (let i = 0; i < mutations.length; i++) {
      if (mutations[i].addedNodes.length) {
        for (let a = 0; a < mutations[i].addedNodes.length; a++) {
          if (mutations[i].addedNodes[a].nodeName == "H2") {
            usernameNode = mutations[i].addedNodes[a];
            //// console.log("nya")
          }
        }
      }
    }

    function addTrait(value, description, color, id) {
      // Create the tag
      let tag = document.createElement("div");
      tag.className = "tetra_tag_gametime";
      tag.title = description;
      tag.style.color = color;
      tag.innerHTML = value;
      id ? (tag.id = id) : (tag.id = "");

      // Add it once, to measure width
      document
        .getElementsByClassName("tetra_tag_holder")
        [document.getElementsByClassName("tetra_tag_holder").length - 1].insertBefore(
          tag,
          document
            .getElementsByClassName("tetra_tag_holder")
            [document.getElementsByClassName("tetra_tag_holder").length - 1].getElementsByTagName(
              "br"
            )[0]
        );

      // Check if there's space
      let space = 0;

      let targetElements = document
        .getElementsByClassName("tetra_tag_holder")
        [document.getElementsByClassName("tetra_tag_holder").length - 1].getElementsByClassName(
          "tetra_tag_gametime"
        );
      for (let i = 0; i < targetElements.length; i++) {
        // Hard coded margin, doubt this will change
        space += targetElements[i].getBoundingClientRect().width + 4;
      }
      // Add another row if there isn't space
      if (
        document.getElementsByClassName("tetra_tag_holder").length == 1 ||
        space >
          document
            .getElementsByClassName("tetra_tag_holder")
            [document.getElementsByClassName("tetra_tag_holder").length - 1].getBoundingClientRect()
            .width
      ) {
        let tetraTagDiv = document.createElement("div");
        tetraTagDiv.className = "tetra_tag_holder ns";
        tetraTagDiv.style.marginTop = "0px";
        let insertAfterThis =
          document.getElementsByClassName("tetra_tag_holder")[
            document.getElementsByClassName("tetra_tag_holder").length - 1
          ];
        insertAfterThis.parentNode.insertBefore(tetraTagDiv, insertAfterThis.nextSibling);
        // Add two line break elements for spacing
        document
          .getElementsByClassName("tetra_tag_holder")
          [document.getElementsByClassName("tetra_tag_holder").length - 1].appendChild(
            document.createElement("br")
          );
        document
          .getElementsByClassName("tetra_tag_holder")
          [document.getElementsByClassName("tetra_tag_holder").length - 1].appendChild(
            document.createElement("br")
          );

        // Reinsert tag
        document
          .getElementsByClassName("tetra_tag_holder")
          [document.getElementsByClassName("tetra_tag_holder").length - 1].insertBefore(
            tag,
            document
              .getElementsByClassName("tetra_tag_holder")
              [document.getElementsByClassName("tetra_tag_holder").length - 1].getElementsByTagName(
                "br"
              )[0]
          );
      }
    }

    getData("users/lists/league/all");

    async function calculateUserStats() {
      // Get the big tetra league data
      let tlDataPromise = getData("users/lists/league/all");
      let tStart = Date.now();
      if (!usernameNode) {
        return;
      }
      addTrait(
        "TETR.IO VERGE IS LOADING. . .",
        "This may take up to 5 seconds depending on your internet connection and TETR.IO API response times.",
        "#b3f4b6",
        "loading"
      );

      let user = usernameNode.textContent.toLowerCase();
      // console.log(user)
      // Get the user's data
      let [mainUserData, selfUserData] = await Promise.all([
        getData("users/" + user),
        getData("users/" + localStorage.getItem("tetrio_userID")),
      ]);

      // Get the user's tetra league history
      let mainUserDataHistoryPromise = getData(
        "streams/league_userrecent_" + mainUserData.data.user._id
      );
      let mainUserDataHistory = await mainUserDataHistoryPromise;

      // Get the tetra league leaderboard, we call this now because it takes a good while to fetch sometimes
      let tlData = await tlDataPromise;

      // This is the better version of tlData
      let tlUsers = tlData.data.users;

      if (!tlData.success || !mainUserData.success || !mainUserDataHistory.data.records.length) {
        console.warn("User data is either non-existent or could not be fetched.");
        document.getElementById("loading").textContent = "USER TETRA LEAGUE DATA CANNOT BE FOUND";
        document.getElementById("loading").title =
          "Party's over. . . This can happen if the user hasn't played any tetra league games.";
        return;
      }

      let mainUserMatchHistory = [];
      let mainUserOpponents = [];
      for (let i = 0; i < mainUserDataHistory.data.records.length; i++) {
        if (mainUserDataHistory.data.records[i].endcontext[0].username == user) {
          mainUserMatchHistory.push(true);
          mainUserOpponents.push(mainUserDataHistory.data.records[i].endcontext[1].username);
        } else {
          mainUserMatchHistory.push(false);
          mainUserOpponents.push(mainUserDataHistory.data.records[i].endcontext[0].username);
        }
      }

      // console.log(mainUserMatchHistory);
      // console.log(mainUserOpponents);

      let mainUserMatchHistoryData = await Promise.all(
        mainUserOpponents.map((user) => getData("users/" + user))
      );
      // console.log(mainUserMatchHistoryData);

      // console.log("User data fetched in " + (Date.now() - tStart) / 1000 + " seconds!")

      tStart = Date.now();

      let pps = [];
      let apm = [];
      let vs = [];
      let tr = [];

      // -0.4055 is the secret formula ;)
      let skillGroupRange = Math.round(
        -0.4055 *
          (mainUserData.data.user.league.percentile ** 2 -
            mainUserData.data.user.league.percentile) *
          tlUsers.length +
          10
      );

      let lowerSkillGroup =
        mainUserData.data.user.league.standing - 1 + skillGroupRange < tlUsers.length
          ? mainUserData.data.user.league.standing - 1 + skillGroupRange
          : tlUsers.length;
      let upperSkillGroup =
        mainUserData.data.user.league.standing - 1 - skillGroupRange > 0
          ? mainUserData.data.user.league.standing - 1 - skillGroupRange
          : 0;

      // console.log("Sample size: " + (lowerSkillGroup - upperSkillGroup) + " players");
      // console.log(upperSkillGroup)
      // console.log(lowerSkillGroup)
      // console.log(skillGroupRange);

      // console.log(mainUserData.data.user.league.percentile);
      for (let i = upperSkillGroup; i < lowerSkillGroup; i++) {
        pps.push(tlUsers[i].league.pps);
        apm.push(tlUsers[i].league.apm);
        vs.push(tlUsers[i].league.vs);
        tr.push(tlUsers[i].league.rating);
      }

      pps.sort(function (a, b) {
        return a - b;
      });
      apm.sort(function (a, b) {
        return a - b;
      });
      vs.sort(function (a, b) {
        return a - b;
      });
      tr.sort(function (a, b) {
        return a - b;
      });

      let userPps = mainUserData.data.user.league.pps;
      let userApm = mainUserData.data.user.league.apm;
      let userVs = mainUserData.data.user.league.vs;
      //let userTr = mainUserData.data.user.league.rating;
      let userApp = userApm / 60 / userPps;
      let userVsapm = userVs / userApm;
      let userDsps = userVs / 100 - userApm / 60;
      let userDspp = userDsps / userPps;
      let userGe = (2 * userApp * userDsps) / userPps;

      // Thanks to sheetbot's creators for the formulas below!! I can't thank you enough <3

      let srarea =
        userApm * 0 +
        userPps * 135 +
        userVs * 0 +
        userApp * 290 +
        userDsps * 0 +
        userDspp * 700 +
        userGe * 0;
      let statrank = 11.2 * Math.atan((srarea - 93) / 130) + 1;

      // console.log("Current user: " + mainUserData.data.user.username);

      let goodMood = 0;
      let badMood = 0;
      let overConfident = 0;
      let vengeance = 0;
      let wins = 0;
      let losses = 0;

      let precision = 3;

      for (let i = 0; i < mainUserDataHistory.data.records.length - 1; i++) {
        // If the user won the match and the previous match, increment good mood score
        if (
          mainUserDataHistory.data.records[i].endcontext[0].username == user &&
          mainUserDataHistory.data.records[i + 1].endcontext[0].username == user
        ) {
          goodMood++;
          wins++;
          // If the user lost the match and the previous match, increment bad mood score
        } else if (
          !(mainUserDataHistory.data.records[i].endcontext[0].username == user) &&
          !(mainUserDataHistory.data.records[i + 1].endcontext[0].username == user)
        ) {
          badMood++;
          losses++;
          // If the user lost the match but won the previous match, increment over confident score
        } else if (
          !(mainUserDataHistory.data.records[i].endcontext[0].username == user) &&
          mainUserDataHistory.data.records[i + 1].endcontext[0].username == user
        ) {
          overConfident++;
          losses++;
          // If the user won the match but lost the previous match, increment vengeance score
        } else if (
          mainUserDataHistory.data.records[i].endcontext[0].username == user &&
          !(mainUserDataHistory.data.records[i + 1].endcontext[0].username == user)
        ) {
          vengeance++;
          wins++;
        } else {
          // console.log("oh nyooo")
        }
      }

      let goodMoodScore = goodMood / (goodMood + overConfident);
      let badMoodScore = badMood / (badMood + vengeance);
      let overConfidentScore = overConfident / (overConfident + goodMood);
      let vengeanceScore = vengeance / (vengeance + badMood);

      // Remove loading tag
      document.getElementById("loading").remove();

      // Glicko Calculation
      if (mainUserData.data.user.league.glicko && selfUserData.data.user.league.glicko) {
        let lostChange = glicko2(
          selfUserData.data.user.league.glicko,
          selfUserData.data.user.league.rd,
          0.06,
          [[mainUserData.data.user.league.glicko, mainUserData.data.user.league.rd, 0]]
        );
        let winChange = glicko2(
          selfUserData.data.user.league.glicko,
          selfUserData.data.user.league.rd,
          0.06,
          [[mainUserData.data.user.league.glicko, mainUserData.data.user.league.rd, 1]]
        );
        addTrait(
          `WIN REWARD: ${Math.max(
            glickoToTR(winChange.rating, winChange.rd) - selfUserData.data.user.league.rating,
            0
          ).toFixed(2)}TR`,
          "",
          "#b6b3f4"
        );
        addTrait(
          `LOSE REWARD: ${Math.min(
            glickoToTR(lostChange.rating, lostChange.rd) - selfUserData.data.user.league.rating,
            0
          ).toFixed(2)}TR`,
          "",
          "#f4b6b3"
        );
      }

      if (mainUserDataHistory.data.records[0].endcontext[0].username == user) {
        if (goodMoodScore > 0.75) {
          // console.log("Good mood: This user tends to continue winning if they won their previous match (Winrate " + (goodMoodScore * 100).toFixed(precision) + "%)");
          addTrait(
            "GOOD MOOD",
            "This user tends to continue winning if they won their previous match (Winrate " +
              (goodMoodScore * 100).toFixed(precision) +
              "%)",
            "#b6b3f4"
          );
        } else if (overConfidentScore > 0.75) {
          // console.log("Over confident: This user tends to lose if they won their previous match. (Winrate " + overConfidentScore * 100 + "%)");
          addTrait(
            "OVER CONFIDENT",
            "This user tends to lose if they won their previous match. (Winrate " +
              (100 - overConfidentScore * 100).toFixed(precision) +
              "%)",
            1,
            "#f4b6b3"
          );
        } else {
          // console.log("Level headed: This user's winrate is not heavily affected if they won their previous match. (Winrate " + ((goodMoodScore) * 100).toFixed(precision) + "%)");
          addTrait(
            "LEVEL HEADED",
            "This user's winrate is not heavily affected if they won their previous match. (Winrate " +
              (goodMoodScore * 100).toFixed(precision) +
              "%)",
            "#b6b3f4"
          );
        }
      } else {
        if (badMoodScore > 0.75) {
          // console.log("Bad mood: This user tends to continue losing if they lost their previous match. (Winrate " + (badMoodScore * 100).toFixed(precision) + "%)");
          addTrait(
            "BAD MOOD",
            "This user tends to continue losing if they lost their previous match. (Winrate " +
              (100 - badMoodScore * 100).toFixed(precision) +
              "%)",
            "#f4b6b3"
          );
        } else if (vengeanceScore > 0.75) {
          // console.log("Vengeance: This user tends to win if they lost their previous match. (Winrate " + (vengeanceScore * 100).toFixed(precision) + "%)");
          addTrait(
            "VENGEANCE",
            "This user tends to win if they lost their previous match. (Winrate " +
              (vengeanceScore * 100).toFixed(precision) +
              "%)",
            "#b6b3f4"
          );
        } else {
          // console.log("Level headed: This user's winrate is not heavily affected if they lost their previous match. (Winrate " + ((vengeanceScore) * 100).toFixed(precision) + "%)");
          addTrait(
            "LEVEL HEADED",
            "This user's winrate is not heavily affected if they lost their previous match. (Winrate " +
              (vengeanceScore * 100).toFixed(precision) +
              "%)",
            "#b6b3f4"
          );
        }
      }
      // console.log("This user's winrate is " + (100 * wins / 9).toFixed(precision) + "%.");

      if (calculatePercentile(userPps, pps).toFixed(precision) > 75) {
        addTrait(
          "HIGH PPS",
          "This user has a high average PPS compared to other players (Top " +
            calculatePercentile(userPps, pps).toFixed(precision) +
            " %)",
          "#b6b3f4"
        );
      } else if (calculatePercentile(userPps, pps).toFixed(precision) < 25) {
        addTrait(
          "LOW PPS",
          "This user has a low average PPS compared to other players (Bottom " +
            calculatePercentile(userPps, pps).toFixed(precision) +
            " %)",
          "#f4b6b3"
        );
      }
      if (calculatePercentile(userApm, apm).toFixed(precision) > 75) {
        addTrait(
          "HIGH APM",
          "This user has a high average APM compared to other players (Top " +
            calculatePercentile(userApm, apm).toFixed(precision) +
            " %)",
          "#b6b3f4"
        );
      } else if (calculatePercentile(userApm, apm).toFixed(precision) < 25) {
        addTrait(
          "LOW APM",
          "This user has a low average APM compared to other players (Bottom " +
            calculatePercentile(userApm, apm).toFixed(precision) +
            " %)",
          "#f4b6b3"
        );
      }
      if (calculatePercentile(userVs, vs).toFixed(precision) > 75) {
        addTrait(
          "HIGH VS",
          "This user has a high average VS compared to other players (Top " +
            calculatePercentile(userVs, vs).toFixed(precision) +
            " %)",
          "#b6b3f4"
        );
      } else if (calculatePercentile(userVs, vs).toFixed(precision) < 25) {
        addTrait(
          "LOW VS",
          "This user has a low average VS compared to other players (Bottom " +
            calculatePercentile(userVs, vs).toFixed(precision) +
            " %)",
          "#f4b6b3"
        );
      }

      let openerScore = Number(
        Number(
          Number(
            (userApm / srarea / (0.069 * 1.0017 ** (statrank ** 5 / 4700) + statrank / 360) -
              1 +
              (userPps /
                srarea /
                (0.0084264 * 2.14 ** (-2 * (statrank / 2.7 + 1.03)) - statrank / 5750 + 0.0067) -
                1) *
                0.75 +
              (userVsapm / (-(((statrank - 16) / 36) ** 2) + 2.133) - 1) * -10 +
              (userApp / (0.1368803292 * 1.0024 ** (statrank ** 5 / 2800) + statrank / 54) - 1) *
                0.75 +
              (userDspp /
                (0.02136327583 * 14 ** ((statrank - 14.75) / 3.9) + statrank / 152 + 0.022) -
                1) *
                -0.25) /
              3.5
          ) + 0.5
        ).toFixed(4)
      );
      let plonkScore = Number(
        Number(
          (userGe / (statrank / 350 + 0.005948424455 * 3.8 ** ((statrank - 6.1) / 4) + 0.006) -
            1 +
            (userApp / (0.1368803292 * 1.0024 ** (statrank ** 5 / 2800) + statrank / 54) - 1) +
            (userDspp /
              (0.02136327583 * 14 ** ((statrank - 14.75) / 3.9) + statrank / 152 + 0.022) -
              1) *
              0.75 +
            (userPps /
              srarea /
              (0.0084264 * 2.14 ** (-2 * (statrank / 2.7 + 1.03)) - statrank / 5750 + 0.0067) -
              1) *
              -1) /
            2.73 +
            0.5
        ).toFixed(4)
      );
      let strideScore = Number(
        Number(
          ((userApm / srarea / (0.069 * 1.0017 ** (statrank ** 5 / 4700) + statrank / 360) - 1) *
            -0.25 +
            (userPps /
              srarea /
              (0.0084264 * 2.14 ** (-2 * (statrank / 2.7 + 1.03)) - statrank / 5750 + 0.0067) -
              1) +
            (userApp / (0.1368803292 * 1.0024 ** (statrank ** 5 / 2800) + statrank / 54) - 1) * -2 +
            (userDspp /
              (0.02136327583 * 14 ** ((statrank - 14.75) / 3.9) + statrank / 152 + 0.022) -
              1) *
              -0.5) *
            0.79 +
            0.5
        ).toFixed(4)
      );
      let infdsScore = Number(
        Number(
          (userDspp / (0.02136327583 * 14 ** ((statrank - 14.75) / 3.9) + statrank / 152 + 0.022) -
            1 +
            (userApp / (0.1368803292 * 1.0024 ** (statrank ** 5 / 2800) + statrank / 54) - 1) *
              -0.75 +
            (userApm / srarea / (0.069 * 1.0017 ** (statrank ** 5 / 4700) + statrank / 360) - 1) *
              0.5 +
            (userVsapm / (-(((statrank - 16) / 36) ** 2) + 2.133) - 1) * 1.5 +
            (userPps /
              srarea /
              (0.0084264 * 2.14 ** (-2 * (statrank / 2.7 + 1.03)) - statrank / 5750 + 0.0067) -
              1) *
              0.5) *
            0.9 +
            0.5
        ).toFixed(4)
      );

      let playstyle = [openerScore, plonkScore, strideScore, infdsScore];

      let descriptions = [
        { title: "OPENER", description: "This user is likely an opener main" },
        { title: "PLONKER", description: "This user is likely a plonker" },
        { title: "STRIDER", description: "This user is likely a strider" },
        { title: "INF DS'ER", description: "This user is likely an infnite downstacker" },
      ];

      let mainPlaystyle = playstyle.indexOf(Math.max(...playstyle));
      playstyle[mainPlaystyle] = -playstyle[mainPlaystyle];
      let secondaryPlaystyle =
        playstyle[playstyle.indexOf(Math.max(...playstyle))] > -0.75 * playstyle[mainPlaystyle]
          ? playstyle.indexOf(Math.max(...playstyle))
          : undefined;

      // console.log(secondaryPlaystyle)
      // console.log(mainPlaystyle);
      // console.log(playstyle);

      // console.log("Opener score: " + openerScore);
      // console.log("Plonk score: " + plonkScore);
      // console.log("Stride score: " + strideScore);
      // console.log("Infds score: " + infdsScore);

      let playstyleWinrate = [
        { wins: 0, played: 0 },
        { wins: 0, played: 0 },
        { wins: 0, played: 0 },
        { wins: 0, played: 0 },
      ];

      for (let i = 0; i < mainUserMatchHistoryData.length; i++) {
        let userPps = mainUserMatchHistoryData[i].data.user.league.pps;
        let userApm = mainUserMatchHistoryData[i].data.user.league.apm;
        let userVs = mainUserMatchHistoryData[i].data.user.league.vs;
        let userApp = userApm / 60 / userPps;
        let userVsapm = userVs / userApm;
        let userDsps = userVs / 100 - userApm / 60;
        let userDspp = userDsps / userPps;
        let userGe = (2 * userApp * userDsps) / userPps;

        let srarea =
          userApm * 0 +
          userPps * 135 +
          userVs * 0 +
          userApp * 290 +
          userDsps * 0 +
          userDspp * 700 +
          userGe * 0;
        let statrank = 11.2 * Math.atan((srarea - 93) / 130) + 1;

        let openerScore = Number(
          Number(
            Number(
              (userApm / srarea / (0.069 * 1.0017 ** (statrank ** 5 / 4700) + statrank / 360) -
                1 +
                (userPps /
                  srarea /
                  (0.0084264 * 2.14 ** (-2 * (statrank / 2.7 + 1.03)) - statrank / 5750 + 0.0067) -
                  1) *
                  0.75 +
                (userVsapm / (-(((statrank - 16) / 36) ** 2) + 2.133) - 1) * -10 +
                (userApp / (0.1368803292 * 1.0024 ** (statrank ** 5 / 2800) + statrank / 54) - 1) *
                  0.75 +
                (userDspp /
                  (0.02136327583 * 14 ** ((statrank - 14.75) / 3.9) + statrank / 152 + 0.022) -
                  1) *
                  -0.25) /
                3.5
            ) + 0.5
          ).toFixed(4)
        );
        let plonkScore = Number(
          Number(
            (userGe / (statrank / 350 + 0.005948424455 * 3.8 ** ((statrank - 6.1) / 4) + 0.006) -
              1 +
              (userApp / (0.1368803292 * 1.0024 ** (statrank ** 5 / 2800) + statrank / 54) - 1) +
              (userDspp /
                (0.02136327583 * 14 ** ((statrank - 14.75) / 3.9) + statrank / 152 + 0.022) -
                1) *
                0.75 +
              (userPps /
                srarea /
                (0.0084264 * 2.14 ** (-2 * (statrank / 2.7 + 1.03)) - statrank / 5750 + 0.0067) -
                1) *
                -1) /
              2.73 +
              0.5
          ).toFixed(4)
        );
        let strideScore = Number(
          Number(
            ((userApm / srarea / (0.069 * 1.0017 ** (statrank ** 5 / 4700) + statrank / 360) - 1) *
              -0.25 +
              (userPps /
                srarea /
                (0.0084264 * 2.14 ** (-2 * (statrank / 2.7 + 1.03)) - statrank / 5750 + 0.0067) -
                1) +
              (userApp / (0.1368803292 * 1.0024 ** (statrank ** 5 / 2800) + statrank / 54) - 1) *
                -2 +
              (userDspp /
                (0.02136327583 * 14 ** ((statrank - 14.75) / 3.9) + statrank / 152 + 0.022) -
                1) *
                -0.5) *
              0.79 +
              0.5
          ).toFixed(4)
        );
        let infdsScore = Number(
          Number(
            (userDspp /
              (0.02136327583 * 14 ** ((statrank - 14.75) / 3.9) + statrank / 152 + 0.022) -
              1 +
              (userApp / (0.1368803292 * 1.0024 ** (statrank ** 5 / 2800) + statrank / 54) - 1) *
                -0.75 +
              (userApm / srarea / (0.069 * 1.0017 ** (statrank ** 5 / 4700) + statrank / 360) - 1) *
                0.5 +
              (userVsapm / (-(((statrank - 16) / 36) ** 2) + 2.133) - 1) * 1.5 +
              (userPps /
                srarea /
                (0.0084264 * 2.14 ** (-2 * (statrank / 2.7 + 1.03)) - statrank / 5750 + 0.0067) -
                1) *
                0.5) *
              0.9 +
              0.5
          ).toFixed(4)
        );

        let playstyle = [openerScore, plonkScore, strideScore, infdsScore];
        let mainPlaystyle = playstyle.indexOf(Math.max(...playstyle));
        playstyle[mainPlaystyle] = -playstyle[mainPlaystyle];
        let secondaryPlaystyle =
          playstyle[playstyle.indexOf(Math.max(...playstyle))] > -0.75 * playstyle[mainPlaystyle]
            ? playstyle.indexOf(Math.max(...playstyle))
            : undefined;

        playstyleWinrate[mainPlaystyle].played++;
        Number.isInteger(secondaryPlaystyle)
          ? playstyleWinrate[secondaryPlaystyle].played++
          : "mrow" == "mrow";

        // If the main user won against this user...
        if (mainUserMatchHistory[i]) {
          playstyleWinrate[mainPlaystyle].wins++;
          Number.isInteger(secondaryPlaystyle)
            ? playstyleWinrate[secondaryPlaystyle].wins++
            : "mrow" == "mrow";
        }
      }
      // TODO: Optimize it. Too bad!

      // console.log(playstyleWinrate);
      let playstyleWinrateDescriptions = ["openers", "plonkers", "striders", "inf ds'ers"];
      for (let i = 0; i < playstyleWinrate.length; i++) {
        if (playstyleWinrate[i].wins / playstyleWinrate[i].played > 0.65) {
          addTrait(
            "WINS AGAINST " + playstyleWinrateDescriptions[i].toUpperCase(),
            "This user has a high winrate against " +
              playstyleWinrateDescriptions[i] +
              ". (Winrate " +
              ((100 * playstyleWinrate[i].wins) / playstyleWinrate[i].played).toFixed(precision) +
              "%)",
            "#b6b3f4"
          );
        } else if (playstyleWinrate[i].wins / playstyleWinrate[i].played < 0.35) {
          addTrait(
            "LOSES AGAINST " + playstyleWinrateDescriptions[i].toUpperCase(),
            "This user has a low winrate against " +
              playstyleWinrateDescriptions[i] +
              ". (Winrate " +
              ((100 * playstyleWinrate[i].wins) / playstyleWinrate[i].played).toFixed(precision) +
              "%)",
            "#f4b6b3"
          );
        }
      }

      Number.isInteger(secondaryPlaystyle)
        ? addTrait(
            descriptions[secondaryPlaystyle].title,
            descriptions[secondaryPlaystyle].description
          )
        : "nya" == "nya";

      addTrait(descriptions[mainPlaystyle].title, descriptions[mainPlaystyle].description);
      // console.log("User statistics calculated in " + (Date.now() - tStart) / 1000 + " seconds!")
    }

    calculateUserStats();
  });

  // This detects when the page is loaded
  dialogsObserver.observe(dialogsNode, config);

  let loadedObserver = new MutationObserver((mutations) => {
    if (
      stringify(updateData.version) != VERSION &&
      document.documentElement.getAttribute("style")
    ) {
      // console.log("Page loaded!");

      let dialogDiv = document.createElement("div");
      dialogDiv.style =
        "display: block; position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 999999; background-color: #000D; transition: visibility 0.5s, opacity 0.5s";
      dialogDiv.id = "update_overlay";
      document.body.appendChild(dialogDiv);

      let mainDiv = document.createElement("div");
      mainDiv.style.zIndex = "1999999";
      mainDiv.className = "oob_modal patchnotes wide_modal";
      dialogDiv.appendChild(mainDiv);

      let header = document.createElement("h1");
      header.innerHTML = "VERGE NEEDS AN UPDATE";
      mainDiv.appendChild(header);

      let updateNum = document.createElement("h1");
      updateNum.innerHTML = stringify(updateData.version);

      let updateNickname = document.createElement("h6");
      updateNickname.innerHTML = '"' + stringify(updateData.version_nickname) + '"';

      let mainContent = document.createElement("div");
      mainContent.className = "dialog_long";

      mainContent.appendChild(updateNum);
      mainContent.appendChild(updateNickname);

      if (PLATFORM == "desktop") {
        let windowsIH = document.createElement("h2");
        windowsIH.style.color = "#00FF96";
        windowsIH.innerHTML = "Windows Users: ";
        windowsIH.dataset.content = windowsIH.innerHTML;

        let windowsUI = document.createElement("p");
        windowsUI.innerHTML =
          "1. Open Windows PowerShell <br>2. Copy the code below and run it in PowerShell. <b><i>Make sure to close TETR.IO first before running code!</b></i><br>3. Reopen TETR.IO. Your client is now updated!";

        let windowsInputCode = document.createElement("input");
        windowsInputCode.autocomplete = "off";
        windowsInputCode.className = "config_input mono_input rg_target_pri";
        windowsInputCode.style = "left: 2%";
        windowsInputCode.style.width = "97%";
        windowsInputCode.readOnly = "readonly";

        windowsInputCode.value =
          'cd ~; cd .\\AppData\\Local\\Programs\\tetrio-desktop\\resources\\; Invoke-WebRequest -Uri "' +
          stringify(updateData.desktop_update_url) +
          '" -OutFile "app.asar"';
        let windowsCodeCopy = document.createElement("button");
        windowsCodeCopy.innerHTML = "COPY";
        windowsCodeCopy.className = "control_button button_tr rg_target_pri";
        windowsCodeCopy.dataset.hover = "tap";
        windowsCodeCopy.dataset.hit = "click";
        windowsCodeCopy.id = "windowsCodeCopy";
        windowsCodeCopy.style.position = "relative";
        windowsCodeCopy.style.left = "1%";
        windowsCodeCopy.style.fontFamily = "HUN";
        windowsCodeCopy.style.top = "0px";

        let appleIH = document.createElement("h2");
        appleIH.style.color = "#9600FF";
        appleIH.innerHTML = "MacOS Users: ";
        appleIH.dataset.content = appleIH.innerHTML;

        let appleUI = document.createElement("p");
        appleUI.innerHTML =
          '1. Download the file found <a href="' +
          stringify(updateData.desktop_update_url) +
          '" target="_blank">here</a>.<br>2.Find the TETR.IO Desktop application in the Applications folder in Finder.<br>3.Right click TETR.IO Desktop and click "Show Package Contents".<br>4.Open the "Contents" folder and then the "resources" folder.<br>5. Replace app.asar with the file you downloaded.<br>6. Your client is now updated!';

        mainContent.appendChild(windowsIH);
        mainContent.appendChild(windowsUI);
        mainContent.appendChild(windowsInputCode);
        mainContent.appendChild(windowsCodeCopy);
        mainContent.appendChild(appleIH);
        mainContent.appendChild(appleUI);
        mainDiv.appendChild(document.createElement("p")).appendChild(mainContent);

        document.getElementById("windowsCodeCopy").addEventListener("click", function () {
          navigator.clipboard.writeText(windowsInputCode.value);
          document.getElementById("windowsCodeCopy").innerHTML = "COPIED!";
        });
      }

      let buttonHolder = document.createElement("div");
      buttonHolder.className = "oob_button_holder flex-row ns";

      let learnMoreBtn = document.createElement("div");
      learnMoreBtn.className = "oob_button flex-item";
      learnMoreBtn.innerHTML = "LEARN MORE ABOUT THIS UPDATE";
      learnMoreBtn.id = "learnMoreBtn";
      learnMoreBtn.onclick = function () {
        window.open(stringify(updateData.patchnotes_url), "_blank");
      };

      let okBtn = document.createElement("div");
      okBtn.className = "oob_button flex-item pri";
      okBtn.innerHTML = "OKI";
      okBtn.id = "okBtn";
      okBtn.onclick = function () {
        document.getElementById("update_overlay").style.visibility = "hidden";
        document.getElementById("update_overlay").style.opacity = "0";
      };

      buttonHolder.appendChild(learnMoreBtn);
      buttonHolder.appendChild(okBtn);

      mainDiv.appendChild(buttonHolder);

      loadedObserver.disconnect();
    }
  });
  window.onclick = function (event) {
    if (event.target == document.getElementById("update_overlay")) {
      document.getElementById("update_overlay").style.visibility = "hidden";
      document.getElementById("update_overlay").style.opacity = "0";
    }
  };

  loadedObserver.observe(document.body, config);
});

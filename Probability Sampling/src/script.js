// 뽑기 확률 계산기(loot box simulator) v4
// Author: ProjectEli (https://projecteli.tistory.com/199)
// Date: 2022-05-26
// ProjectEli 2022, All rights reserved.
// v1 (2022-01-17): initial release
// v2 (2022-05-26): introduced binary search for required trials. Increased upper limit of trials to 1e7 and displayed required trials to 2**31-1. Minor change in displayed characters
// v3 (2022-10-14): display probability for the title of N<=10 table
// v3.1 (2023-06-02): UI correction, enhance precision of binary search, increased upper limit to Number.MAX_SAFE_INTEGER
// v4 (2023-10-26): Update Bootstrap to 5.3.2, JQuery to 3.7.1, Mathjs to 11.11.2, Correct roundings in input group UI. Refactoring probability calculation, improved performance

var tooltipTriggerList = [].slice.call(
  document.querySelectorAll('[data-bs-toggle="tooltip"]')
);
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new bootstrap.Tooltip(tooltipTriggerEl);
});

$("#btn-prop-calc").click(function (event) {
  $("input").prop("disabled", true);
  $("#btn-prop-calc").prop("disabled", true);
  $("#prop-calc-result").addClass("hidden");
  $("#loader").removeClass("hidden");

  setTimeout(MainWork, 500);
});

function MainWork() {
  var startTime = performance.now();
  let resulttag = $("#prop-calc-result");
  let probvalue = parseFloat($("#probvalue").val()) / 100; // double number
  let costper = parseFloat($("#costper").val()); // double number
  let costperUnit = $("#costperunit option:checked").text();
  let trials = parseInt($("#numtrials").val());
  let numwant = parseInt($("#numwant").val());

  let isValidInputPack = IsValidInput(probvalue, trials, numwant);
  let isValidInput = isValidInputPack[0];
  let errMsg = isValidInputPack[1];

  if (isValidInput) {
    let problist = calc_probs_partial(probvalue, trials, numwant); // only calculates first numwant-1 array components min 10 elements to show

    // main calculation
    let successtable = buildSuccessTable(problist, trials, numwant);
    let firstFewWinnings = buildFirstFewWinningsTable(
      problist,
      trials,
      numwant
    );

    let targetProbPercentList = [
      10,
      20,
      30,
      40,
      50,
      60,
      70,
      80,
      90,
      95,
      98,
      99
    ];
    let requiredTrials = buildRequiredTrialsTable(
      probvalue,
      numwant,
      costper,
      costperUnit,
      targetProbPercentList
    );

    // display success or not prob
    resulttag.html(
      "<h2>" +
        (probvalue * 100).toString() +
        "%확률 뽑기 " +
        trials.toString() +
        "회 시도시 목표 달성률</h2>"
    );
    resulttag.append(successtable);

    // display first few winnings
    resulttag.append(
      "<h2>" +
        (probvalue * 100).toString() +
        "%확률 뽑기 " +
        trials.toString() +
        "회 시도시 N회 이상 당첨 확률(당첨 10회까지)</h2>"
    );
    resulttag.append(firstFewWinnings);

    // display required trials
    resulttag.append(
      "<h2>1회당 당첨 확률이 " +
        (probvalue * 100).toString() +
        "%일 때 " +
        numwant.toString() +
        "회 이상 당첨될 때까지 예상 뽑기 횟수</h2>"
    );
    resulttag.append(requiredTrials);
  } else {
    $("#prop-calc-result").html(errMsg);
  }
  $("#loader").addClass("hidden");
  $("#prop-calc-result").removeClass("hidden");
  $("input").prop("disabled", false);
  $("#btn-prop-calc").prop("disabled", false);

  var endTime = performance.now();
  $("#elapsedtime").text((endTime - startTime).toString() + "ms");
}

function IsValidInput(probvalue, trials, numwant) {
  if (trials < numwant) {
    return [false, "계산 실패: 뽑기 횟수보다 당첨 횟수 목표가 더 많습니다!"];
  } else if (probvalue >= 1) {
    return [false, "계산 실패: 1뽑 확률이 100% 이상입니다!"];
  } else if (trials > 10000000) {
    return [
      false,
      "계산 실패: 뽑기 시도 횟수가 천만 회보다 큽니다!(최대 10000000회)"
    ];
  } else {
    return [true, ""];
  }
}

function probTableTemplate() {
  var outer = document.createElement("div"); // false shell
  let innerHTML = `<table class="table table-striped table-hover">
            <thead>
                <tr>`;
  for (let k = 0; k < arguments.length; k++) {
    innerHTML += "<th>" + arguments[k] + "</th>"; // col header texts
  }
  innerHTML += `</tr>
            </thead>
            <tbody>
            </tbody>
        </table>`;
  outer.innerHTML = innerHTML;
  return outer.firstChild;
}

function setRowContent() {
  // input: row, numtext, probspercent1, probspercent2, ...
  let row = arguments[0];
  let numtext = arguments[1];

  // first row
  let tdtrials = document.createElement("td");
  tdtrials.innerHTML = numtext; // ex: "1회 이상"
  row.appendChild(tdtrials);

  // rest rows. arguments[k] = probspercent
  for (let k = 2; k < arguments.length; k++) {
    let td = document.createElement("td");
    let propnum = document.createElement("span");
    propnum.className = "propnum";
    propnum.innerHTML = arguments[k].toPrecision(5) + "%";
    let progressbar = document.createElement("div");
    progressbar.className =
      "progress-bar progress-bar-striped progress-bar-animated bg-warning";
    if (k == arguments.length - 1) {
      progressbar.className =
        "progress-bar progress-bar-striped progress-bar-animated";
    }
    progressbar.setAttribute("role", "progressbar");
    progressbar.setAttribute("aria-valuenow", arguments[k]);
    progressbar.style.width = arguments[k].toString() + "%";
    progressbar.setAttribute("aria-valuemin", 0);
    progressbar.setAttribute("aria-valuemax", 100);
    let progress = document.createElement("div");
    progress.className = "progress";
    progress.appendChild(progressbar);
    td.appendChild(propnum);
    td.appendChild(progress);
    row.appendChild(td);
  }
}

function setRowContentRequiredTrials() {
  // input: row, text1, text2, ...
  let row = arguments[0];
  for (let k = 1; k < arguments.length; k++) {
    // arguments[k] = text
    let td = document.createElement("td");
    td.innerHTML = arguments[k];
    row.appendChild(td);
  }
}

function binomial(n, k) {
  if (typeof n !== "number" || typeof k !== "number") {
    return false;
  }
  let logb = 0;
  k = Math.min(k, n - k);
  for (let k2 = 1; k2 <= k; k2++) {
    logb += Math.log(n - k2 + 1) - Math.log(k2);
  }
  return Math.exp(logb);
}

function calc_probs_partial(probvalue, trials, numwant) {
  let problist = [];
  let q = 1 - probvalue;
  // including zero win(+1), considering for loop k<max_k (+1)
  let max_k = Math.min(Math.max(numwant, 10), trials + 2);
  for (let k = 0; k <= max_k; k++) {
    problist[k] =
      binomial(trials, k) *
      Math.exp(k * Math.log(probvalue) + (trials - k) * Math.log(q));
  }
  return problist;
}

function prob_notsuccess_partial(problist, numwant) {
  var sum = 0;
  for (let k = 0; k < numwant; k++) {
    sum += problist[k];
  }
  return sum;
}

function buildSuccessTable(problist, trials, numwant) {
  //assume numwant>=1
  let prob_failed = prob_notsuccess_partial(problist, numwant);
  let prob_succeed = 1 - prob_failed;

  let tb = probTableTemplate("당첨 횟수", "달성 확률");
  var tr = tb.insertRow();
  tr.className = "table-success";
  if (numwant == trials) {
    setRowContent(tr, numwant.toString() + "회", prob_succeed * 100);
  } else {
    setRowContent(tr, numwant.toString() + "회 이상", prob_succeed * 100);
  }
  var tr = tb.insertRow();
  tr.className = "table-danger";
  if (numwant == 1) {
    setRowContent(tr, "0회", prob_failed * 100);
  } else {
    setRowContent(tr, (numwant - 1).toString() + "회 이하", prob_failed * 100);
  }
  return tb;
}

function buildFirstFewWinningsTable(problist, trials, numwant) {
  let criterionNumber = 10;
  let Nrows = Math.min(trials, criterionNumber);
  let tb = probTableTemplate(
    "당첨 횟수",
    "당첨 확률",
    "해당횟수 이상 당첨 확률"
  );
  let cumulativeProbPercent = 0;
  for (let k = 0; k <= Nrows; k++) {
    var tr = tb.insertRow();
    if (numwant == k) {
      tr.className = "table-success";
    }
    let probPercent = problist[k] * 100;
    const inverseCumulativeProbPercent = 100.0 - cumulativeProbPercent;
    if (inverseCumulativeProbPercent >= 0) {
      setRowContent(
        tr,
        k.toString() + "회",
        probPercent,
        inverseCumulativeProbPercent
      );
    } else {
      setRowContent(tr, k.toString() + "회", probPercent, 0);
    }

    cumulativeProbPercent += probPercent;
  }
  return tb;
}

function binomial_cdf_upper(p, n, x) {
  let cdf = 0;
  let logb = 0; // log value of binomial coeff
  const q = 1 - p;
  const n1 = n + 1;
  for (let k = 0; k < x; k++) {
    if (k > 0) {
      logb += Math.log(n1 - k) - Math.log(k);
    }
    cdf += Math.exp(logb + k * Math.log(p) + (n - k) * Math.log(q));
  }
  return 1 - cdf;
}

function requiredTrials(
  winningProbabilityPerTrial,
  targetWinnings,
  targetProb
) {
  let trialsLowerBound = 1;
  let trialsUpperBound = Number.MAX_SAFE_INTEGER;
  do {
    const testTrials = Math.floor((trialsLowerBound + trialsUpperBound) / 2); // avg
    if (testTrials === trialsUpperBound) {
      const testProb = binomial_cdf_upper(
        winningProbabilityPerTrial,
        testTrials,
        targetWinnings
      );
      if (targetProb <= testProb) {
        // last correction
        return testTrials == 1 ? testTrials : testTrials - 1;
      }
      return trialsUpperBound; // select upper bound
    }
    const testProb = binomial_cdf_upper(
      winningProbabilityPerTrial,
      testTrials,
      targetWinnings
    );
    if (targetProb >= testProb) {
      // correction to upper side
      trialsLowerBound = testTrials + 1;
    } else {
      // correction to lower side
      trialsUpperBound = testTrials - 1;
    }
  } while (trialsLowerBound <= trialsUpperBound);
}

function buildRequiredTrialsTable(
  winningProbabilityPerTrial,
  targetWinnings,
  costPerTrial,
  costUnit,
  targetProbPercentList
) {
  const targetProbPercentListLength = targetProbPercentList.length;
  let targetProbList = []; // target Probs to be displayed
  for (let k = 0; k < targetProbPercentListLength; k++) {
    targetProbList.push(targetProbPercentList[k] / 100); // percent to actual number
  }
  let requiredTrialsArray = [];
  for (const targetProb of targetProbList) {
    requiredTrialsArray.push(
      requiredTrials(winningProbabilityPerTrial, targetWinnings, targetProb)
    );
  }

  //build table
  let tb = probTableTemplate(
    "달성 가능성(운 상위%)",
    "요구 뽑기 수",
    "예상 비용"
  );

  for (let k = 0; k < requiredTrialsArray.length; k++) {
    var tr = tb.insertRow();
    let targetProb = targetProbPercentList[k];
    switch (targetProb) {
      case 50:
        tr.className = "table-info";
        break;
      case 90:
        tr.className = "table-success";
        break;
      case 95:
        tr.className = "table-warning";
        break;
      case 98:
        tr.className = "table-primary";
        break;
      case 99:
        tr.className = "table-danger";
        break;
      default:
        break;
    }
    let requiredTrial = requiredTrialsArray[k];
    let expectedCost = requiredTrial * costPerTrial;
    setRowContentRequiredTrials(
      tr,
      targetProb + "%",
      requiredTrial + "회",
      expectedCost.toString() + costUnit
    );
  }
  return tb;
}

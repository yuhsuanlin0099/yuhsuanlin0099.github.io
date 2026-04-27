document.addEventListener("DOMContentLoaded", () => {
  // =================================================================
  // I. 元素與狀態變數 (Elements & State Variables)
  // =================================================================

  // --- A. 頁面元素 (Page Elements) ---
  const page1 = document.getElementById("page-1");
  const page2 = document.getElementById("page-2");
  const pageVideo = document.getElementById("page-video");
  const page2_5 = document.getElementById("page-2-5");
  const page3 = document.getElementById("page-3");
  const pageGame = document.getElementById("page-game");
  const pageTransition = document.getElementById("page-transition");
  const pageResultHigh = document.getElementById("page-result-high");
  const pageResultMid = document.getElementById("page-result-mid");
  const pageResultLow = document.getElementById("page-result-low");

  const allPages = [
    page1,
    pageVideo,
    page2,
    page2_5,
    page3,
    pageGame,
    pageTransition,
    pageResultHigh,
    pageResultMid,
    pageResultLow,
  ];

  // --- B. UI 元素 (UI Elements) ---
  const introVideo = document.getElementById("introVideo");
  const startBtn = document.getElementById("startBtn");
  const toWheel = document.getElementById("toWheel");
  const playerNameInput = document.getElementById("playerNameInput");
  const confirmNameBtn = document.getElementById("confirmNameBtn");
  const items = document.querySelectorAll(".item");
  const finalSelectBtn = document.getElementById("finalSelectBtn");
  const typeTextEl = document.getElementById("typeText");
  const caret = document.getElementById("caret");
  const introBox = document.getElementById("game-intro");
  const introText = document.getElementById("intro-text");
  const startQuizBtn = document.getElementById("start-quiz-btn");
  const quizBox = document.getElementById("game-quiz");
  const quizImg = document.getElementById("quiz-img");
  const quizQuestion = document.getElementById("quiz-question");
  const quizOptions = document.getElementById("quiz-options");
  const confirmQuizBtn = document.getElementById("confirm-quiz-btn");
  const qCounter = document.getElementById("q-counter");
  const animatedImg = document.getElementById("q2-animated-img"); // 動畫圖片元素
  // const videoPlayButton = document.getElementById("videoPlayButton"); // 備案播放按鈕
  const clickSound = document.getElementById("clickSound");

  // --- C. 遊戲狀態 (Game State) ---
  let playerName = "親愛的玩家";
  let current = 2;
  let isAnimating = false;
  let typeWriterInterval = null;
  let currentCharacterKey = "";
  let currentQIndex = 0;
  let currentScore = 0;
  let selectedOptionIndex = null;

  // 角色鍵值對應
  const charKeys = ["4-1", "4-2", "4-3", "4-4"];
  const textToType =
    "你……有交過女朋友嗎？\n你……常惹女朋友生氣嗎？\n如果以上問題讓你心臟停了一拍……那你已經踏入了戀愛的禁區。\n這裡沒有後悔選項，只有生存。\n在你正式踏入這一天之前，必須先辨認出你即將面對的存在。\n現在，選擇你的女朋友類型。這將決定……你今天能不能活著離開。"; // Page 2 的打字機文字

  // --- D. 結局圖片資料庫 (New Result Image Database) ---
  const resultImages = {
    // 🟢 綠色女友 (4-1)
    "4-1": {
      high: "images/gend1.png", // >= 90
      mid: "images/gend2.png", // >= 60
      low: "images/gend3.png", // < 60
    },
    // 🟡 黃色女友 (4-2)
    "4-2": {
      high: "images/yend1.png",
      mid: "images/yend2.png",
      low: "images/yend3.png",
    },
    // 🟣 紫色女友 (4-3)
    "4-3": {
      high: "images/pend1.png",
      mid: "images/pend2.png",
      low: "images/pend3.png",
    },
    // 🔵 藍色女友 (4-4)
    "4-4": {
      high: "images/bend1.png",
      mid: "images/bend2.png",
      low: "images/bend3.png",
    },
  };

  // --- E. 題庫資料庫 (Game Database) ---
  const gameDatabase = {
    // 這裡放入您的 gameDatabase 完整內容
    // (由於內容過長，假設您已經將其完整定義在這個位置，保持不變)
    // --------------------------------------------------------------------------------
    // 🟢 4-1: 綠色女友
    // --------------------------------------------------------------------------------
    "4-1": {
      questions: [
        {
          intro:
            "今天是你們期待已久的約會，但悠然比約定時間晚了半小時才出現。她氣喘吁吁地跑來，臉上的妝容精緻完美，\n顯然是為了這場約會精心打扮。\n這時候，你的第一句話將決定今天的開局是天堂還是地獄。", // 移除 Q1 的動畫情境描述
          introBg: "images/bg3.png",
          q: "Q1: {name}，對不起化妝化太久了有一點晚到，你等很久嗎？",
          qBg: "images/gbg3.5.png",
          options: [
            { img: "images/Q1-1_normal.png", hover: "images/Q1-1_hover.png" },
            { img: "images/Q1-2_normal.png", hover: "images/Q1-2_hover.png" },
            { img: "images/Q1-3_normal.png", hover: "images/Q1-3_hover.png" },
            { img: "images/Q1-4_normal.png", hover: "images/Q1-4_hover.png" },
          ],
          ans: 0,
          wrongImg: "images/gangry1.png",
          // ⭐ 移除: hasIntroAnimation 標記
        },
        {
          intro:
            " 在公車站等車時，一位穿著低胸熱褲的辣妹剛好經過。出自生物本能，你的視線不小心飄過去 0.5 秒，\n但這逃不過悠然的法眼。她設下了一個經典的邏輯陷阱。",
          introBg: "images/gbg3.5.5.png",
          q: "Q2: {name}，你在看什麼呀~他手上抱的貓咪好可愛，你還記得是什麼花色嗎？",
          options: [
            { img: "images/Q2-1_normal.png", hover: "images/Q2-1_hover.png" },
            { img: "images/Q2-2_normal.png", hover: "images/Q2-2_hover.png" },
            { img: "images/Q2-3_normal.png", hover: "images/Q2-3_hover.png" },
            { img: "images/Q2-4_normal.png", hover: "images/Q2-4_hover.png" },
          ],
          ans: 3,
          wrongImg: "images/gangry1.png",
          // ⭐ 新增: 動畫標記到 Q2
          hasIntroAnimation: true,
        },
        {
          intro:
            "經過了剛剛的靈魂拷問，氣氛稍微緩和下來。悠然突然湊近你的臉，眨著大眼睛看著你。\n這是所有男友聞之色變的「找碴環節」。",
          introBg: "images/gbg3.6.png",
          q: "Q3: {name}～～～你覺得我今天哪裡不一樣呀？",
          qBg: "images/gbg3.6.6.png",
          options: [
            { img: "images/Q3-1_normal.png", hover: "images/Q3-1_hover.png" },
            { img: "images/Q3-2_normal.png", hover: "images/Q3-2_hover.png" },
            { img: "images/Q3-3_normal.png", hover: "images/Q3-3_hover.png" },
            { img: "images/Q3-4_normal.png", hover: "images/Q3-4_hover.png" },
          ],
          ans: 1,
          wrongImg: "images/gangry1.png",
        },
        {
          intro:
            " 你們來到寶雅逛街。眾所皆知，寶雅的冷氣有一種神秘力量，會讓人想上廁所。\n悠然面有難色，顯然是被這股神秘力量擊中了。",
          introBg: "images/bg4.png",
          q: "Q4: {name}～寶貝你先去旁邊自己逛一下，我肚子好像不太舒服。",
          qBg: "images/gbg4.4.png",
          options: [
            { img: "images/Q4-1_normal.png", hover: "images/Q4-1_hover.png" },
            { img: "images/Q4-2_normal.png", hover: "images/Q4-2_hover.png" },
            { img: "images/Q4-3_normal.png", hover: "images/Q4-3_hover.png" },
            { img: "images/Q4-4_normal.png", hover: "images/Q4-4_hover.png" },
          ],
          ans: 3,
          wrongImg: "images/gangry2.png",
        },
        {
          intro:
            " 解決完生理需求，悠然心情大好，拉著你去挑化妝品。她指名要一款特定風格的口紅，\n這時候考驗你對色彩的敏感度（以及對她喜好的記憶力）。",
          introBg: "images/bg4.png",
          q: "Q5: {name}～我想要一支蜜桃色的唇釉，你可以幫我挑嗎？",
          qBg: "images/gbg4.5.png",
          options: [
            { img: "images/Q5-1_normal.png", hover: "images/Q5-1_hover.png" },
            { img: "images/Q5-2_normal.png", hover: "images/Q5-2_hover.png" },
            { img: "images/Q5-3_normal.png", hover: "images/Q5-3_hover.png" },
            { img: "images/Q5-4_normal.png", hover: "images/Q5-4_hover.png" },
          ],
          ans: 1,
          wrongImg: "images/gangry2.png",
        },
        {
          intro:
            " 你們點的牛排終於上桌了！香味撲鼻而來，你餓到前胸貼後背，本能地拿起了叉子準備大快朵頤。\n這時，你感覺到一股殺氣從對面射過來...",
          introBg: "images/bg5.5.png",
          q: "Q6: {name}!你在幹嘛？我還沒拍欸！你是餓死鬼投胎喔？",
          qBg: "images/gbg5.5.5.png",
          options: [
            { img: "images/Q6-1_normal.png", hover: "images/Q6-1_hover.png" },
            { img: "images/Q6-2_normal.png", hover: "images/Q6-2_hover.png" },
            { img: "images/Q6-3_normal.png", hover: "images/Q6-3_hover.png" },
            { img: "images/Q6-4_normal.png", hover: "images/Q6-4_hover.png" },
          ],
          ans: 1,
          wrongImg: "images/gangry3.png",
        },
        {
          intro:
            " 好不容易拍完照（大概過了 10 分鐘），終於可以吃了。悠然因為說要減肥，只點了「凱薩沙拉」，\n但她的眼神一直死死盯著你盤子裡那塊鮮嫩多汁的和牛排。",
          introBg: "images/bg5.5.png",
          q: "Q7: {name}～你的牛排看起來好好吃喔...我可以吃『一小口』嗎？",
          qBg: "images/gbg5.5.5.5.png",
          options: [
            { img: "images/Q7-1_normal.png", hover: "images/Q7-1_hover.png" },
            { img: "images/Q7-2_normal.png", hover: "images/Q7-2_hover.png" },
            { img: "images/Q7-3_normal.png", hover: "images/Q7-3_hover.png" },
            { img: "images/Q7-4_normal.png", hover: "images/Q7-4_hover.png" },
          ],
          ans: 2,
          wrongImg: "images/gangry3.png",
        },
        {
          intro:
            " 在耶誕城時，悠然請你幫她拍照，但人太多加上燈光亂反射，沒有拍出她想要的漂亮照片，悠然露出失望的小眼神。",
          introBg: "images/bg6.png",
          q: "Q8: {name}...怎麼都糊掉了啦，而且都沒有一張好看！",
          qBg: "images/gbg6.6.png",
          options: [
            { img: "images/Q8-1_normal.png", hover: "images/Q8-1_hover.png" },
            { img: "images/Q8-2_normal.png", hover: "images/Q8-2_hover.png" },
            { img: "images/Q8-3_normal.png", hover: "images/Q8-3_hover.png" },
            { img: "images/Q8-4_normal.png", hover: "images/Q8-4_hover.png" },
          ],
          ans: 1,
          wrongImg: "images/gangry4.png",
        },
        {
          intro:
            "耶誕城的行程即將到達尾聲，但耶誕城人山人海，你想要轉身牽女友，卻突然發現女友不見了！ ",
          introBg: "images/bg6.png",
          q: "Q9: 請你努力回想悠然的樣子才能找回失散的女友，請問哪一個是悠然今天的穿搭？",
          qBg: "images/bg6.6.png",
          options: [
            { img: "images/Q9-1_normal.png", hover: "images/Q9-1_hover.png" },
            { img: "images/Q9-2_normal.png", hover: "images/Q9-2_hover.png" },
            { img: "images/Q9-3_normal.png", hover: "images/Q9-3_hover.png" },
            { img: "images/Q9-4_normal.png", hover: "images/Q9-4_hover.png" },
          ],
          ans: 3,
          wrongImg: "images/gangry4.png",
        },
        {
          intro:
            "你們走在回家路上，原本以為可以就此結束今天的約會行程，但悠然突然轉過頭看著你說... ",
          introBg: "images/bg7.png",
          q: "Q10: {name}~~其實我知道我脾氣不好，今天又遲到，還一直叫你幫我拍照...我是不是問題有點多，你會不會覺得我有公主病？",
          qBg: "images/gbg7.7.png",
          options: [
            { img: "images/Q10-1_normal.png", hover: "images/Q10-1_hover.png" },
            { img: "images/Q10-2_normal.png", hover: "images/Q10-2_hover.png" },
            { img: "images/Q10-3_normal.png", hover: "images/Q10-3_hover.png" },
            { img: "images/Q10-4_normal.png", hover: "images/Q10-4_hover.png" },
          ],
          ans: 2,
          wrongImg: "images/gangry4.png",
        },
      ],
    },

    // --------------------------------------------------------------------------------
    // 🟡 4-2: 黃色女友
    // --------------------------------------------------------------------------------
    "4-2": {
      questions: [
        {
          intro:
            "今天是你們期待已久的約會，但若菈比約定時間晚了半小時才出現。她氣喘吁吁地跑來，臉上的妝容精緻完美，\n顯然是為了這場約會精心打扮。\n這時候，你的第一句話將決定今天的開局是天堂還是地獄。", // 移除 Q1 的動畫情境描述
          introBg: "images/bg3.png",
          q: "Q1: {name}，對不起化妝化太久了有一點晚到，你等很久嗎？",
          qBg: "images/ybg3.5.png",
          options: [
            { img: "images/Q1-1_normal.png", hover: "images/Q1-1_hover.png" },
            { img: "images/Q1-2_normal.png", hover: "images/Q1-2_hover.png" },
            { img: "images/Q1-3_normal.png", hover: "images/Q1-3_hover.png" },
            { img: "images/Q1-4_normal.png", hover: "images/Q1-4_hover.png" },
          ],
          ans: 0,
          wrongImg: "images/yangry1.png",
          // ⭐ 移除: hasIntroAnimation 標記
        },
        {
          intro:
            " 在公車站等車時，一位穿著低胸熱褲的辣妹剛好經過。出自生物本能，你的視線不小心飄過去 0.5 秒，\n但這逃不過若菈的法眼。她設下了一個經典的邏輯陷阱。",
          introBg: "images/ybg3.5.5.png",
          q: "Q2: {name}，你在看什麼呀~他手上抱的貓咪好可愛，你還記得是什麼花色嗎？",
          options: [
            { img: "images/Q2-1_normal.png", hover: "images/Q2-1_hover.png" },
            { img: "images/Q2-2_normal.png", hover: "images/Q2-2_hover.png" },
            { img: "images/Q2-3_normal.png", hover: "images/Q2-3_hover.png" },
            { img: "images/Q2-4_normal.png", hover: "images/Q2-4_hover.png" },
          ],
          ans: 3,
          wrongImg: "images/yangry1.png",
          // ⭐ 新增: 動畫標記到 Q2
          hasIntroAnimation: true,
        },
        {
          intro:
            "經過了剛剛的靈魂拷問，氣氛稍微緩和下來。若菈突然湊近你的臉，眨著大眼睛看著你。\n這是所有男友聞之色變的「找碴環節」。",
          introBg: "images/ybg3.6.png",
          q: "Q3: {name}～～～你覺得我今天哪裡不一樣呀？",
          qBg: "images/ybg3.6.6.png",
          options: [
            { img: "images/Q3-1_normal.png", hover: "images/Q3-1_hover.png" },
            { img: "images/Q3-2_normal.png", hover: "images/Q3-2_hover.png" },
            { img: "images/Q3-3_normal.png", hover: "images/Q3-3_hover.png" },
            { img: "images/Q3-4_normal.png", hover: "images/Q3-4_hover.png" },
          ],
          ans: 1,
          wrongImg: "images/yangry1.png",
        },
        {
          intro:
            " 你們來到寶雅逛街。眾所皆知，寶雅的冷氣有一種神秘力量，會讓人想上廁所。\n若菈面有難色，顯然是被這股神秘力量擊中了。",
          introBg: "images/bg4.png",
          q: "Q4: {name}～寶貝你先去旁邊自己逛一下，我肚子好像不太舒服。",
          qBg: "images/ybg4.4.png",
          options: [
            { img: "images/Q4-1_normal.png", hover: "images/Q4-1_hover.png" },
            { img: "images/Q4-2_normal.png", hover: "images/Q4-2_hover.png" },
            { img: "images/Q4-3_normal.png", hover: "images/Q4-3_hover.png" },
            { img: "images/Q4-4_normal.png", hover: "images/Q4-4_hover.png" },
          ],
          ans: 3,
          wrongImg: "images/yangry2.png",
        },
        {
          intro:
            " 解決完生理需求，若菈心情大好，拉著你去挑化妝品。她指名要一款特定風格的口紅，\n這時候考驗你對色彩的敏感度（以及對她喜好的記憶力）。",
          introBg: "images/bg4.png",
          q: "Q5: {name}～我想要一支蜜桃色的唇釉，你可以幫我挑嗎？",
          qBg: "images/ybg4.5.png",
          options: [
            { img: "images/Q5-1_normal.png", hover: "images/Q5-1_hover.png" },
            { img: "images/Q5-2_normal.png", hover: "images/Q5-2_hover.png" },
            { img: "images/Q5-3_normal.png", hover: "images/Q5-3_hover.png" },
            { img: "images/Q5-4_normal.png", hover: "images/Q5-4_hover.png" },
          ],
          ans: 1,
          wrongImg: "images/yangry2.png",
        },
        {
          intro:
            " 你們點的牛排終於上桌了！香味撲鼻而來，你餓到前胸貼後背，本能地拿起了叉子準備大快朵頤。\n這時，你感覺到一股殺氣從對面射過來...",
          introBg: "images/bg5.5.png",
          q: "Q6: {name}!你在幹嘛？我還沒拍欸！你是餓死鬼投胎喔？",
          qBg: "images/ybg5.5.5.png",
          options: [
            { img: "images/Q6-1_normal.png", hover: "images/Q6-1_hover.png" },
            { img: "images/Q6-2_normal.png", hover: "images/Q6-2_hover.png" },
            { img: "images/Q6-3_normal.png", hover: "images/Q6-3_hover.png" },
            { img: "images/Q6-4_normal.png", hover: "images/Q6-4_hover.png" },
          ],
          ans: 1,
          wrongImg: "images/yangry3.png",
        },
        {
          intro:
            " 好不容易拍完照（大概過了 10 分鐘），終於可以吃了。若菈因為說要減肥，只點了「凱薩沙拉」，\n但她的眼神一直死死盯著你盤子裡那塊鮮嫩多汁的和牛排。",
          introBg: "images/bg5.5.png",
          q: "Q7: {name}～你的牛排看起來好好吃喔...我可以吃『一小口』嗎？",
          qBg: "images/ybg5.5.5.5.png",
          options: [
            { img: "images/Q7-1_normal.png", hover: "images/Q7-1_hover.png" },
            { img: "images/Q7-2_normal.png", hover: "images/Q7-2_hover.png" },
            { img: "images/Q7-3_normal.png", hover: "images/Q7-3_hover.png" },
            { img: "images/Q7-4_normal.png", hover: "images/Q7-4_hover.png" },
          ],
          ans: 2,
          wrongImg: "images/yangry3.png",
        },
        {
          intro:
            " 在耶誕城時，若菈請你幫她拍照，但人太多加上燈光亂反射，沒有拍出她想要的漂亮照片，若菈露出失望的小眼神。",
          introBg: "images/bg6.png",
          q: "Q8: {name}...怎麼都糊掉了啦，而且都沒有一張好看！",
          qBg: "images/ybg6.6.png",
          options: [
            { img: "images/Q8-1_normal.png", hover: "images/Q8-1_hover.png" },
            { img: "images/Q8-2_normal.png", hover: "images/Q8-2_hover.png" },
            { img: "images/Q8-3_normal.png", hover: "images/Q8-3_hover.png" },
            { img: "images/Q8-4_normal.png", hover: "images/Q8-4_hover.png" },
          ],
          ans: 1,
          wrongImg: "images/yangry4.png",
        },
        {
          intro:
            "耶誕城的行程即將到達尾聲，但耶誕城人山人海，你想要轉身牽女友，卻突然發現女友不見了！ ",
          introBg: "images/bg6.png",
          q: "Q9: 請你努力回想若菈的樣子才能找回失散的女友，請問哪一個是若菈今天的穿搭？",
          qBg: "images/bg6.6.png",
          options: [
            { img: "images/Q9-1_normal.png", hover: "images/Q9-1_hover.png" },
            { img: "images/Q9-2_normal.png", hover: "images/Q9-2_hover.png" },
            { img: "images/Q9-3_normal.png", hover: "images/Q9-3_hover.png" },
            { img: "images/Q9-4_normal.png", hover: "images/Q9-4_hover.png" },
          ],
          ans: 1,
          wrongImg: "images/yangry4.png",
        },
        {
          intro:
            "你們走在回家路上，原本以為可以就此結束今天的約會行程，但若菈突然轉過頭看著你說... ",
          introBg: "images/bg7.png",
          q: "Q10: {name}~~其實我知道我脾氣不好，今天又遲到，還一直叫你幫我拍照...我是不是問題有點多，你會不會覺得我有公主病？",
          qBg: "images/ybg7.7.png",
          options: [
            { img: "images/Q10-1_normal.png", hover: "images/Q10-1_hover.png" },
            { img: "images/Q10-2_normal.png", hover: "images/Q10-2_hover.png" },
            { img: "images/Q10-3_normal.png", hover: "images/Q10-3_hover.png" },
            { img: "images/Q10-4_normal.png", hover: "images/Q10-4_hover.png" },
          ],
          ans: 2,
          wrongImg: "images/yangry4.png",
        },
      ],
    },

    // --------------------------------------------------------------------------------
    // 🟣 4-3: 紫色女友 (調整動畫觸發點)
    // --------------------------------------------------------------------------------
    "4-3": {
      questions: [
        {
          intro:
            "今天是你們期待已久的約會，但在熙比約定時間晚了半小時才出現。她氣喘吁吁地跑來，臉上的妝容精緻完美，\n顯然是為了這場約會精心打扮。\n這時候，你的第一句話將決定今天的開局是天堂還是地獄。", // 移除 Q1 的動畫情境描述
          introBg: "images/bg3.png",
          q: "Q1: {name}，對不起化妝化太久了有一點晚到，你等很久嗎？",
          qBg: "images/pbg3.5.png",
          options: [
            { img: "images/Q1-1_normal.png", hover: "images/Q1-1_hover.png" },
            { img: "images/Q1-2_normal.png", hover: "images/Q1-2_hover.png" },
            { img: "images/Q1-3_normal.png", hover: "images/Q1-3_hover.png" },
            { img: "images/Q1-4_normal.png", hover: "images/Q1-4_hover.png" },
          ],
          ans: 0,
          wrongImg: "images/pangry1.png",
          // ⭐ 移除: hasIntroAnimation 標記
        },
        {
          intro:
            " 在公車站等車時，一位穿著低胸熱褲的辣妹剛好經過。出自生物本能，你的視線不小心飄過去 0.5 秒，\n但這逃不過在熙的法眼。她設下了一個經典的邏輯陷阱。",
          introBg: "images/pbg3.5.5.png",
          q: "Q2: {name}，你在看什麼呀~他手上抱的貓咪好可愛，你還記得是什麼花色嗎？",
          options: [
            { img: "images/Q2-1_normal.png", hover: "images/Q2-1_hover.png" },
            { img: "images/Q2-2_normal.png", hover: "images/Q2-2_hover.png" },
            { img: "images/Q2-3_normal.png", hover: "images/Q2-3_hover.png" },
            { img: "images/Q2-4_normal.png", hover: "images/Q2-4_hover.png" },
          ],
          ans: 3,
          wrongImg: "images/pangry1.png",
          // ⭐ 新增: 動畫標記到 Q2
          hasIntroAnimation: true,
        },
        {
          intro:
            "經過了剛剛的靈魂拷問，氣氛稍微緩和下來。在熙突然湊近你的臉，眨著大眼睛看著你。\n這是所有男友聞之色變的「找碴環節」。",
          introBg: "images/pbg3.6.png",
          q: "Q3: {name}～～～你覺得我今天哪裡不一樣呀？",
          qBg: "images/pbg3.6.6.png",
          options: [
            { img: "images/Q3-1_normal.png", hover: "images/Q3-1_hover.png" },
            { img: "images/Q3-2_normal.png", hover: "images/Q3-2_hover.png" },
            { img: "images/Q3-3_normal.png", hover: "images/Q3-3_hover.png" },
            { img: "images/Q3-4_normal.png", hover: "images/Q3-4_hover.png" },
          ],
          ans: 1,
          wrongImg: "images/pangry1.png",
        },
        {
          intro:
            " 你們來到寶雅逛街。眾所皆知，寶雅的冷氣有一種神秘力量，會讓人想上廁所。\n在熙面有難色，顯然是被這股神秘力量擊中了。",
          introBg: "images/bg4.png",
          q: "Q4: {name}～寶貝你先去旁邊自己逛一下，我肚子好像不太舒服。",
          qBg: "images/pbg4.4.png",
          options: [
            { img: "images/Q4-1_normal.png", hover: "images/Q4-1_hover.png" },
            { img: "images/Q4-2_normal.png", hover: "images/Q4-2_hover.png" },
            { img: "images/Q4-3_normal.png", hover: "images/Q4-3_hover.png" },
            { img: "images/Q4-4_normal.png", hover: "images/Q4-4_hover.png" },
          ],
          ans: 3,
          wrongImg: "images/pangry2.png",
        },
        {
          intro:
            " 解決完生理需求，在熙心情大好，拉著你去挑化妝品。她指名要一款特定風格的口紅，\n這時候考驗你對色彩的敏感度（以及對她喜好的記憶力）。",
          introBg: "images/bg4.png",
          q: "Q5: {name}～我想要一支蜜桃色的唇釉，你可以幫我挑嗎？",
          qBg: "images/pbg4.4.png",
          options: [
            { img: "images/Q5-1_normal.png", hover: "images/Q5-1_hover.png" },
            { img: "images/Q5-2_normal.png", hover: "images/Q5-2_hover.png" },
            { img: "images/Q5-3_normal.png", hover: "images/Q5-3_hover.png" },
            { img: "images/Q5-4_normal.png", hover: "images/Q5-4_hover.png" },
          ],
          ans: 1,
          wrongImg: "images/pangry2.png",
        },
        {
          intro:
            " 你們點的牛排終於上桌了！香味撲鼻而來，你餓到前胸貼後背，本能地拿起了叉子準備大快朵頤。\n這時，你感覺到一股殺氣從對面射過來...",
          introBg: "images/bg5.5.png",
          q: "Q6: {name}!你在幹嘛？我還沒拍欸！你是餓死鬼投胎喔？",
          qBg: "images/pbg5.5.5.png",
          options: [
            { img: "images/Q6-1_normal.png", hover: "images/Q6-1_hover.png" },
            { img: "images/Q6-2_normal.png", hover: "images/Q6-2_hover.png" },
            { img: "images/Q6-3_normal.png", hover: "images/Q6-3_hover.png" },
            { img: "images/Q6-4_normal.png", hover: "images/Q6-4_hover.png" },
          ],
          ans: 1,
          wrongImg: "images/pangry3.png",
        },
        {
          intro:
            " 好不容易拍完照（大概過了 10 分鐘），終於可以吃了。在熙因為說要減肥，只點了「凱薩沙拉」，\n但她的眼神一直死死盯著你盤子裡那塊鮮嫩多汁的和牛排。",
          introBg: "images/bg5.5.png",
          q: "Q7: {name}～你的牛排看起來好好吃喔...我可以吃『一小口』嗎？",
          qBg: "images/pbg5.5.5.5.png",
          options: [
            { img: "images/Q7-1_normal.png", hover: "images/Q7-1_hover.png" },
            { img: "images/Q7-2_normal.png", hover: "images/Q7-2_hover.png" },
            { img: "images/Q7-3_normal.png", hover: "images/Q7-3_hover.png" },
            { img: "images/Q7-4_normal.png", hover: "images/Q7-4_hover.png" },
          ],
          ans: 2,
          wrongImg: "images/pangry3.png",
        },
        {
          intro:
            " 在耶誕城時，在熙請你幫她拍照，但人太多加上燈光亂反射，沒有拍出她想要的漂亮照片，在熙露出失望的小眼神。",
          introBg: "images/bg6.png",
          q: "Q8: {name}...怎麼都糊掉了啦，而且都沒有一張好看！",
          qBg: "images/pbg6.6.png",
          options: [
            { img: "images/Q8-1_normal.png", hover: "images/Q8-1_hover.png" },
            { img: "images/Q8-2_normal.png", hover: "images/Q8-2_hover.png" },
            { img: "images/Q8-3_normal.png", hover: "images/Q8-3_hover.png" },
            { img: "images/Q8-4_normal.png", hover: "images/Q8-4_hover.png" },
          ],
          ans: 1,
          wrongImg: "images/pangry4.png",
        },
        {
          intro:
            "耶誕城的行程即將到達尾聲，但耶誕城人山人海，你想要轉身牽女友，卻突然發現女友不見了！ ",
          introBg: "images/bg6.png",
          q: "Q9: 請你努力回想在熙的樣子才能找回失散的女友，請問哪一個是在熙今天的穿搭？",
          qBg: "images/bg6.6.png",
          options: [
            { img: "images/Q9-1_normal.png", hover: "images/Q9-1_hover.png" },
            { img: "images/Q9-2_normal.png", hover: "images/Q9-2_hover.png" },
            { img: "images/Q9-3_normal.png", hover: "images/Q9-3_hover.png" },
            { img: "images/Q9-4_normal.png", hover: "images/Q9-4_hover.png" },
          ],
          ans: 0,
          wrongImg: "images/pangry4.png",
        },
        {
          intro:
            "你們走在回家路上，原本以為可以就此結束今天的約會行程，但在熙突然轉過頭看著你說... ",
          introBg: "images/bg7.png",
          q: "Q10: {name}~~其實我知道我脾氣不好，今天又遲到，還一直叫你幫我拍照...我是不是問題有點多，你會不會覺得我有公主病？",
          qBg: "images/pbg7.7.png",
          options: [
            { img: "images/Q10-1_normal.png", hover: "images/Q10-1_hover.png" },
            { img: "images/Q10-2_normal.png", hover: "images/Q10-2_hover.png" },
            { img: "images/Q10-3_normal.png", hover: "images/Q10-3_hover.png" },
            { img: "images/Q10-4_normal.png", hover: "images/Q10-4_hover.png" },
          ],
          ans: 2,
          wrongImg: "images/pangry5.png",
        },
      ],
    },

    // --------------------------------------------------------------------------------
    // 🔵 4-4: 藍色女友 (略過其他題目，保留結構)
    // --------------------------------------------------------------------------------
    "4-4": {
      questions: [
        {
          intro:
            "今天是你們期待已久的約會，但璟妍比約定時間晚了半小時才出現。她氣喘吁吁地跑來，臉上的妝容精緻完美，\n顯然是為了這場約會精心打扮。\n這時候，你的第一句話將決定今天的開局是天堂還是地獄。", // 移除 Q1 的動畫情境描述
          introBg: "images/bg3.png",
          q: "Q1: {name}，對不起化妝化太久了有一點晚到，你等很久嗎？",
          qBg: "images/bbg3.5.png",
          options: [
            { img: "images/Q1-1_normal.png", hover: "images/Q1-1_hover.png" },
            { img: "images/Q1-2_normal.png", hover: "images/Q1-2_hover.png" },
            { img: "images/Q1-3_normal.png", hover: "images/Q1-3_hover.png" },
            { img: "images/Q1-4_normal.png", hover: "images/Q1-4_hover.png" },
          ],
          ans: 0,
          wrongImg: "images/bangry1.png",
          // ⭐ 移除: hasIntroAnimation 標記
        },
        {
          intro:
            " 在公車站等車時，一位穿著低胸熱褲的辣妹剛好經過。出自生物本能，你的視線不小心飄過去 0.5 秒，\n但這逃不過璟妍的法眼。她設下了一個經典的邏輯陷阱。",
          introBg: "images/bbg3.5.5.png",
          q: "Q2: {name}，你在看什麼呀~他手上抱的貓咪好可愛，你還記得是什麼花色嗎？",
          options: [
            { img: "images/Q2-1_normal.png", hover: "images/Q2-1_hover.png" },
            { img: "images/Q2-2_normal.png", hover: "images/Q2-2_hover.png" },
            { img: "images/Q2-3_normal.png", hover: "images/Q2-3_hover.png" },
            { img: "images/Q2-4_normal.png", hover: "images/Q2-4_hover.png" },
          ],
          ans: 3,
          wrongImg: "images/bangry1.png",
          // ⭐ 新增: 動畫標記到 Q2
          hasIntroAnimation: true,
        },
        {
          intro:
            "經過了剛剛的靈魂拷問，氣氛稍微緩和下來。璟妍突然湊近你的臉，眨著大眼睛看著你。\n這是所有男友聞之色變的「找碴環節」。",
          introBg: "images/bbg3.6.png",
          q: "Q3: {name}～～～你覺得我今天哪裡不一樣呀？",
          qBg: "images/bbg3.6.6.png",
          options: [
            { img: "images/Q3-1_normal.png", hover: "images/Q3-1_hover.png" },
            { img: "images/Q3-2_normal.png", hover: "images/Q3-2_hover.png" },
            { img: "images/Q3-3_normal.png", hover: "images/Q3-3_hover.png" },
            { img: "images/Q3-4_normal.png", hover: "images/Q3-4_hover.png" },
          ],
          ans: 1,
          wrongImg: "images/bangry1.png",
        },
        {
          intro:
            " 你們來到寶雅逛街。眾所皆知，寶雅的冷氣有一種神秘力量，會讓人想上廁所。\n璟妍面有難色，顯然是被這股神秘力量擊中了。",
          introBg: "images/bg4.png",
          q: "Q4: {name}～寶貝你先去旁邊自己逛一下，我肚子好像不太舒服。",
          qBg: "images/bbg4.4.png",
          options: [
            { img: "images/Q4-1_normal.png", hover: "images/Q4-1_hover.png" },
            { img: "images/Q4-2_normal.png", hover: "images/Q4-2_hover.png" },
            { img: "images/Q4-3_normal.png", hover: "images/Q4-3_hover.png" },
            { img: "images/Q4-4_normal.png", hover: "images/Q4-4_hover.png" },
          ],
          ans: 3,
          wrongImg: "images/bangry2.png",
        },
        {
          intro:
            " 解決完生理需求，璟妍心情大好，拉著你去挑化妝品。她指名要一款特定風格的口紅，\n這時候考驗你對色彩的敏感度（以及對她喜好的記憶力）。",
          introBg: "images/bg4.png",
          q: "Q5: {name}～我想要一支蜜桃色的唇釉，你可以幫我挑嗎？",
          qBg: "images/bbg4.5.png",
          options: [
            { img: "images/Q5-1_normal.png", hover: "images/Q5-1_hover.png" },
            { img: "images/Q5-2_normal.png", hover: "images/Q5-2_hover.png" },
            { img: "images/Q5-3_normal.png", hover: "images/Q5-3_hover.png" },
            { img: "images/Q5-4_normal.png", hover: "images/Q5-4_hover.png" },
          ],
          ans: 1,
          wrongImg: "images/bangry2.png",
        },
        {
          intro:
            " 你們點的牛排終於上桌了！香味撲鼻而來，你餓到前胸貼後背，本能地拿起了叉子準備大快朵頤。\n這時，你感覺到一股殺氣從對面射過來...",
          introBg: "images/bg5.5.png",
          q: "Q6: {name}!你在幹嘛？我還沒拍欸！你是餓死鬼投胎喔？",
          qBg: "images/bbg5.5.5.png",
          options: [
            { img: "images/Q6-1_normal.png", hover: "images/Q6-1_hover.png" },
            { img: "images/Q6-2_normal.png", hover: "images/Q6-2_hover.png" },
            { img: "images/Q6-3_normal.png", hover: "images/Q6-3_hover.png" },
            { img: "images/Q6-4_normal.png", hover: "images/Q6-4_hover.png" },
          ],
          ans: 1,
          wrongImg: "images/bangry3.png",
        },
        {
          intro:
            " 好不容易拍完照（大概過了 10 分鐘），終於可以吃了。璟妍因為說要減肥，只點了「凱薩沙拉」，\n但她的眼神一直死死盯著你盤子裡那塊鮮嫩多汁的和牛排。",
          introBg: "images/bg5.5.png",
          q: "Q7: {name}～你的牛排看起來好好吃喔...我可以吃『一小口』嗎？",
          qBg: "images/bbg5.5.5.5.png",
          options: [
            { img: "images/Q7-1_normal.png", hover: "images/Q7-1_hover.png" },
            { img: "images/Q7-2_normal.png", hover: "images/Q7-2_hover.png" },
            { img: "images/Q7-3_normal.png", hover: "images/Q7-3_hover.png" },
            { img: "images/Q7-4_normal.png", hover: "images/Q7-4_hover.png" },
          ],
          ans: 2,
          wrongImg: "images/bangry3.png",
        },
        {
          intro:
            " 在耶誕城時，璟妍請你幫她拍照，但人太多加上燈光亂反射，沒有拍出她想要的漂亮照片，璟妍露出失望的小眼神。",
          introBg: "images/bg6.png",
          q: "Q8: {name}...怎麼都糊掉了啦，而且都沒有一張好看！",
          qBg: "images/bbg6.6.png",
          options: [
            { img: "images/Q8-1_normal.png", hover: "images/Q8-1_hover.png" },
            { img: "images/Q8-2_normal.png", hover: "images/Q8-2_hover.png" },
            { img: "images/Q8-3_normal.png", hover: "images/Q8-3_hover.png" },
            { img: "images/Q8-4_normal.png", hover: "images/Q8-4_hover.png" },
          ],
          ans: 1,
          wrongImg: "images/bangry4.png",
        },
        {
          intro:
            "耶誕城的行程即將到達尾聲，但耶誕城人山人海，你想要轉身牽女友，卻突然發現女友不見了！ ",
          introBg: "images/bg6.png",
          q: "Q9: 請你努力回想璟妍的樣子才能找回失散的女友，請問哪一個是璟妍今天的穿搭？",
          qBg: "images/bg6.6.png",
          options: [
            { img: "images/Q9-1_normal.png", hover: "images/Q9-1_hover.png" },
            { img: "images/Q9-2_normal.png", hover: "images/Q9-2_hover.png" },
            { img: "images/Q9-3_normal.png", hover: "images/Q9-3_hover.png" },
            { img: "images/Q9-4_normal.png", hover: "images/Q9-4_hover.png" },
          ],
          ans: 2,
          wrongImg: "images/bangry4.png",
        },
        {
          intro:
            "你們走在回家路上，原本以為可以就此結束今天的約會行程，但璟妍突然轉過頭看著你說... ",
          introBg: "images/bg7.png",
          q: "Q10: {name}~~其實我知道我脾氣不好，今天又遲到，還一直叫你幫我拍照...我是不是問題有點多，你會不會覺得我有公主病？",
          qBg: "images/bbg7.7.png",
          options: [
            { img: "images/Q10-1_normal.png", hover: "images/Q10-1_hover.png" },
            { img: "images/Q10-2_normal.png", hover: "images/Q10-2_hover.png" },
            { img: "images/Q10-3_normal.png", hover: "images/Q10-3_hover.png" },
            { img: "images/Q10-4_normal.png", hover: "images/Q10-4_hover.png" },
          ],
          ans: 2,
          wrongImg: "images/bangry4.png",
        },
      ],
    },
  };

  // =================================================================
  // II. 核心功能函式 (Core Functions)
  // =================================================================

  // --- A. 頁面切換 (必須先定義) ---
  function showPageById(id) {
    allPages.forEach((p) => p.classList.add("hidden"));
    const t = document.getElementById(id);
    if (t) t.classList.remove("hidden");
  }

  function showPage(n) {
    if (n === 1) showPageById("page-1");
    if (n === 2) showPageById("page-2");
    if (n === 2.5) showPageById("page-2-5");
    if (n === 3) showPageById("page-3");
  }
  // --- END A. 頁面切換 ---
  // ⭐ 新增：播放點擊音效函式 ⭐
  function playClickSound() {
    const clickSound = document.getElementById("clickSound");
    if (clickSound) {
      clickSound.currentTime = 0;

      // 💡 解決行動裝置/某些瀏覽器播放限制
      clickSound.play().catch((e) => console.error("點擊音效播放失敗:", e));
    }
  }
  // --- B. Page 2 打字機效果 ---
  function startTyping() {
    if (!typeTextEl || !caret) return;

    if (toWheel) toWheel.style.display = "none";

    typeTextEl.textContent = "";
    caret.style.display = "inline-block";

    let i = 0;
    const timer = setInterval(() => {
      typeTextEl.textContent += textToType.charAt(i);
      i++;

      if (i >= textToType.length) {
        clearInterval(timer);
        setTimeout(() => {
          caret.style.display = "none";
        }, 600);

        if (toWheel) toWheel.style.display = "inline-block";
      }
    }, 60);
  }

  // --- C. Page 3 輪播渲染 ---
  function renderCarousel() {
    setTimeout(() => {
      isAnimating = false;
    }, 600);

    const frontCenterScale = 1.3;
    const frontCenterZ = 100;
    const midBackScale = 0.8;
    const midBackZ = -150;
    const sideScale = 1.0;
    const sideZ = 0;
    const sideX = 350;
    const sideY = 20;

    items.forEach((item, i) => {
      let pos;
      if (i === current) pos = 3; // Front Center
      else if (i === (current + 1) % items.length) pos = 4; // Right Side
      else if (i === (current - 1 + items.length) % items.length)
        pos = 1; // Left Side
      else pos = 2; // Back

      let transform = "",
        opacity = 1,
        z = 5;

      switch (pos) {
        case 3:
          transform = `translateX(0px) translateY(0px) translateZ(${frontCenterZ}px) scale(${frontCenterScale})`;
          opacity = 1;
          z = 10;
          break;
        case 1:
          transform = `translateX(${-sideX}px) translateY(${sideY}px) translateZ(${sideZ}px) scale(${sideScale})`;
          opacity = 0.8;
          z = 7;
          break;
        case 4:
          transform = `translateX(${sideX}px) translateY(${sideY}px) translateZ(${sideZ}px) scale(${sideScale})`;
          opacity = 0.8;
          z = 7;
          break;
        default:
          transform = `translateX(0px) translateY(0px) translateZ(${midBackZ}px) scale(${midBackScale})`;
          opacity = 0.5;
          z = 1;
      }

      item.style.transform = transform;
      item.style.opacity = opacity;
      item.style.zIndex = z;
    });
  }

  // --- D. 測驗打字機效果 (Intro & Question) ---
  function playIntro(text) {
    const data = gameDatabase[currentCharacterKey].questions[currentQIndex];

    // 設定 Intro 背景
    if (data.introBg) {
      pageGame.style.backgroundImage = `url('${data.introBg}')`;
    } else if (data.bg) {
      pageGame.style.backgroundImage = `url('${data.bg}')`; // 兼容舊的 bg 屬性
    }

    // ⭐ START: 動畫處理邏輯 (修改這裡!)
    animatedImg.classList.add("hidden");
    animatedImg.classList.remove("animate-slide");

    // 檢查當前題目是否有 hasIntroAnimation 屬性
    // 之前: if (currentCharacterKey === "4-3" && currentQIndex === 1 && data.hasIntroAnimation)
    if (data.hasIntroAnimation) {
      // <-- 🌟 只判斷題目的 data 屬性
      animatedImg.src = "images/beauty.png";

      // 確保 class 清除後再開始動畫
      setTimeout(() => {
        animatedImg.classList.remove("hidden");
        animatedImg.classList.add("animate-slide");
      }, 100);
    }
    // ⭐ END: 動畫處理邏輯

    introText.textContent = "";
    let i = 0;

    if (typeWriterInterval) clearInterval(typeWriterInterval);

    typeWriterInterval = setInterval(() => {
      introText.textContent += text.charAt(i);
      i++;
      if (i >= text.length) clearInterval(typeWriterInterval);
    }, 50);
  }

  function playQuestion(text) {
    quizQuestion.textContent = "";
    let i = 0;

    const interval = setInterval(() => {
      quizQuestion.textContent += text.charAt(i);
      i++;

      if (i >= text.length) clearInterval(interval);
    }, 35);
  }

  // --- E. 渲染題目與選項 ---
  function renderQuestion() {
    const data = gameDatabase[currentCharacterKey].questions[currentQIndex];
    if (!data) return;

    // ⭐ 答題畫面出現時，隱藏動畫圖片
    animatedImg.classList.add("hidden");
    animatedImg.classList.remove("animate-slide");

    // 設定題目背景
    if (data.qBg) {
      pageGame.style.backgroundImage = `url('${data.qBg}')`;
    } else if (data.bg) {
      pageGame.style.backgroundImage = `url('${data.bg}')`;
    }

    // 清除所有特殊佈局 class
    quizOptions.classList.remove("q5-options-layout");

    // 檢查是否為 Q5 (索引為 4)
    if (currentQIndex === 4) {
      quizOptions.classList.add("q5-options-layout");
    }

    // 題目上方大圖
    quizImg.src = data.img || "";

    // 題目文字（含玩家名字代入）
    const finalText = (data.q || "").replace("{name}", playerName);
    playQuestion(finalText);

    // 題號
    qCounter.textContent = currentQIndex + 1;

    // 清空選項區
    quizOptions.innerHTML = "";
    selectedOptionIndex = null;

    // 建立選項按鈕
    data.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "option-btn";

      const img = document.createElement("img");
      img.src = opt.img;

      btn.appendChild(img);

      // hover 效果
      btn.onmouseenter = () => {
        if (opt.hover) img.src = opt.hover;
      };
      btn.onmouseleave = () => {
        if (!btn.classList.contains("selected")) img.src = opt.img;
      };

      // 點選效果
      btn.onclick = () => {
        const allBtns = quizOptions.querySelectorAll(".option-btn");
        allBtns.forEach((b, idx) => {
          b.classList.remove("selected");
          // 確保未選中時恢復到 normal 圖片
          const optionData = data.options[idx];
          if (!b.classList.contains("selected")) {
            b.querySelector("img").src = optionData.img;
          }
        });

        btn.classList.add("selected");
        if (opt.hover) img.src = opt.hover;

        selectedOptionIndex = i;
      };

      quizOptions.appendChild(btn);
    });
  }
  // --- F. 處理答錯反應 ---
  function showWrongReaction(data) {
    introBox.classList.remove("hidden");
    quizBox.classList.add("hidden");

    const wrongImg = data.wrongImg || "images/default_wrong.png";

    pageGame.style.backgroundImage = "none";

    // 顯示錯誤圖片
    introText.innerHTML = `<img class="wrong-reaction-img" src="${wrongImg}">`;

    // 讓確認鍵顯示在最上層
    startQuizBtn.style.zIndex = "9999";

    startQuizBtn.onclick = () => {
      goToNextQuestion();
    };
  }

  // --- G. 進入下一題或顯示結果 ---
  function goToNextQuestion() {
    const list = gameDatabase[currentCharacterKey].questions;

    currentQIndex++;

    if (currentQIndex < list.length) {
      introBox.classList.remove("hidden");
      quizBox.classList.add("hidden");

      playIntro(list[currentQIndex].intro);

      startQuizBtn.onclick = () => {
        playClickSound(); // ⭐ 確保這裡有音效 ⭐
        introBox.classList.add("hidden");
        quizBox.classList.remove("hidden");
        renderQuestion();
      };
    } else {
      showPageById("page-transition");
      setTimeout(() => {
        showResult();
      }, 2000);
    }
  }

  // --- H. 顯示結局 ---
  function showResult() {
    document.querySelectorAll(".final-score-display").forEach((el) => {
      el.textContent = currentScore;
    });

    let resultKey; // high, mid, or low
    let pageId;

    // 判斷分數並設定結果鍵值和頁面 ID
    if (currentScore >= 80) {
      resultKey = "high";
      pageId = "page-result-high";
    } else if (currentScore >= 50) {
      resultKey = "mid";
      pageId = "page-result-mid";
    } else {
      resultKey = "low";
      pageId = "page-result-low";
    }

    // 獲取圖片路徑
    const imagePath = resultImages[currentCharacterKey][resultKey];

    // 顯示對應的結果頁面
    showPageById(pageId);

    let resultImgEl;
    if (pageId === "page-result-high") {
      resultImgEl = document.getElementById("finalResultImageHigh");
    } else if (pageId === "page-result-mid") {
      resultImgEl = document.getElementById("finalResultImageMid");
    } else {
      // page-result-low
      resultImgEl = document.getElementById("finalResultImageLow");
    }

    if (resultImgEl) {
      resultImgEl.src = imagePath; // 🌟 動態設定圖片來源
    }
  }

  // =================================================================
  // III. 事件監聽器 (Event Listeners)
  // =================================================================

  // --- Page 1 → Video (YouTube) ---
  if (startBtn) {
    startBtn.onclick = () => {
      playClickSound();

      // 1) 靜音背景音樂
      const audioEl = document.getElementById("backgroundMusic");
      if (audioEl) audioEl.muted = true;

      // 2) 切換到影片頁
      showPageById("page-video");

      // 3) 播放 YouTube（如果 API 還沒 ready，就先記一個旗標）
      if (window.player && typeof window.player.playVideo === "function") {
        window.player.seekTo(0, true);
        window.player.playVideo();
      } else {
        window.__pendingPlayIntro = true;

        // 保底：如果 YouTube API 載入失敗，不要卡住，直接進 Page 2
        setTimeout(() => {
          if (!window.player || typeof window.player.playVideo !== "function") {
            window.goToPage2FromIntro?.();
          }
        }, 1500);
      }
    };
  }

  // --- Video → Page 2 ---

  if (introVideo) {
    introVideo.addEventListener("ended", () => {
      // 影片播放結束後，將影片靜音，並切換頁面
      introVideo.muted = true;

      // ⭐ 恢復背景音樂 ⭐
      const audioEl = document.getElementById("backgroundMusic");
      if (audioEl) {
        audioEl.muted = false;
      }

      showPage(2);
      startTyping();
    });
  }

  // 手動播放按鈕的邏輯 (確保點擊後也能恢復背景音樂)
  const videoPlayButton = document.getElementById("videoPlayButton");
  if (videoPlayButton) {
    videoPlayButton.onclick = () => {
      if (introVideo) {
        introVideo.play();
        introVideo.muted = false; // 手動點擊後也解除影片靜音
      }

      const audioEl = document.getElementById("backgroundMusic");
      if (audioEl) {
        audioEl.muted = true; // 手動播放影片時也靜音背景音樂
      }

      // 點擊後隱藏按鈕
      videoPlayButton.classList.add("hidden");
    };
  }

  // --- Page 2 → Page 2.5 ---
  if (toWheel) {
    toWheel.onclick = () => {
      playClickSound(); // ⭐ 新增音效
      showPage(2.5);
    };
  }

  // --- Page 2.5 → Page 3 (輸入名字) ---
  if (confirmNameBtn) {
    confirmNameBtn.onclick = () => {
      playClickSound();
      const name = playerNameInput.value.trim();
      if (!name) return alert("請輸入名字！");

      playerName = name.substring(0, 8);
      showPage(3);
      renderCarousel();
    };
  }

  // --- Page 3 輪播控制 ---
  if (document.getElementById("prev")) {
    document.getElementById("prev").onclick = () => {
      if (isAnimating) return;
      isAnimating = true;
      current = (current - 1 + items.length) % items.length;
      renderCarousel();
    };
  }

  if (document.getElementById("next")) {
    document.getElementById("next").onclick = () => {
      if (isAnimating) return;
      isAnimating = true;
      current = (current + 1) % items.length;
      renderCarousel();
    };
  }

  // --- Page 3 輪播點擊與 Hover ---
  items.forEach((item, i) => {
    // 點擊 item 切換角色
    item.onclick = () => {
      if (isAnimating || i === current) return;
      isAnimating = true;
      current = i;
      renderCarousel();
    };

    // Hover 預覽
    item.addEventListener("mouseover", () => {
      if (i !== current) return;

      const hoverBox = document.getElementById("hoverPreview");
      const hoverImg = document.getElementById("hoverPreviewImg");

      const infoImages = [
        "images/greeninfo.PNG",
        "images/yellowinfo.PNG",
        "images/purpleinfo.PNG",
        "images/blueinfo.PNG",
      ];

      hoverImg.src = infoImages[i];
      hoverBox.classList.remove("hidden");
    });

    item.addEventListener("mouseout", () => {
      const hoverBox = document.getElementById("hoverPreview");
      hoverBox.classList.add("hidden");
    });
  });

  // --- Page 3 → Page Game Intro (最終選擇) ---
  if (finalSelectBtn) {
    finalSelectBtn.onclick = () => {
      playClickSound();
      if (isAnimating) return;

      currentCharacterKey = charKeys[current];
      currentQIndex = 0;
      currentScore = 0;

      if (!gameDatabase[currentCharacterKey]) {
        alert("題庫尚未建置");
        return;
      }

      showPageById("page-game");
      introBox.classList.remove("hidden");
      quizBox.classList.add("hidden");

      // 開始播放第一段 Intro (包含動畫檢查)
      playIntro(gameDatabase[currentCharacterKey].questions[0].intro);

      // 設置 Intro 按鈕的行為：進入測驗
      startQuizBtn.onclick = () => {
        playClickSound();
        introBox.classList.add("hidden");
        quizBox.classList.remove("hidden");
        startQuizBtn.style.zIndex = "auto";
        renderQuestion();
      };
    };
  }

  // --- Page Game: 答題確認 ---
  confirmQuizBtn.onclick = () => {
    if (selectedOptionIndex === null) return alert("請選擇答案！");
    playClickSound();

    const list = gameDatabase[currentCharacterKey].questions;
    const data = list[currentQIndex];

    // 答對邏輯
    if (selectedOptionIndex === data.ans) {
      currentScore += 10; // 每題 10 分
      goToNextQuestion();
      return;
    }

    // 答錯邏輯
    showWrongReaction(data);
  };

  // =================================================================
  // IV. 初始化 (Initialization)
  // =================================================================

  // --- Intro 影片結束後要做的事（給 YouTube Iframe API 回呼用）---
  window.goToPage2FromIntro = () => {
    // 恢復背景音樂
    const audioEl = document.getElementById("backgroundMusic");
    if (audioEl) audioEl.muted = false;

    showPage(2);
    startTyping();
  };

  showPage(1); // 遊戲從 Page 1 開始
});

// ==============================
// YouTube Iframe API（全螢幕 Intro）
// ==============================
window.player = null;
window.__pendingPlayIntro = false;

window.onYouTubeIframeAPIReady = function () {
  // #player 這個 div 在 index.html 的 page-video 裡 ( <div id="player"></div> )
  window.player = new YT.Player("player", {
    videoId: "0jqR-dL2OQE", // TODO: 換成你的影片 ID
    playerVars: {
      autoplay: 0, // 由 startBtn 觸發播放，比較不會被瀏覽器擋
      controls: 0,
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
    },
    events: {
      onReady: () => {
        if (window.__pendingPlayIntro) {
          window.__pendingPlayIntro = false;
          window.player.seekTo(0, true);
          window.player.playVideo();
        }
      },
      onStateChange: (event) => {
        if (event.data === YT.PlayerState.ENDED) {
          window.goToPage2FromIntro?.();
        }
      },
    },
  });
};

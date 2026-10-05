(() => {
  let deferred = null, registration = null, status = 'オフライン用データを準備中…';
  const installed = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
  const helpButton = document.getElementById('helpButton');
  const installButton = document.createElement('button');
  installButton.id = 'installApp'; installButton.type = 'button'; installButton.className = 'quiet';
  installButton.textContent = 'アプリ'; installButton.setAttribute('aria-label','アプリのインストール案内');
  if (!installed()) helpButton.parentNode.insertBefore(installButton,helpButton);
  function updateStatus(text) {
    status = text;
    const field=document.getElementById('pwaHelpStatus'); if(field)field.textContent=text;
  }
  function renderHelp() {
    const parent=document.getElementById('helpBody');
    if (!parent || document.getElementById('pwaHelpSection')) return;
    const section=document.createElement('section');section.id='pwaHelpSection';
    section.innerHTML='<h3>ホーム画面からアプリとして開く</h3><p>AndroidのChromeではメニューの「アプリをインストール」または「インストール」へ。iPhone/iPadではSafariの共有メニューから「ホーム画面に追加」を選び、表示される場合は「Webアプリとして開く」を有効にします。</p><p>追加したアイコンから起動すると、通常のURLバーがない表示になります。端末の状態バーなどは残る場合があります。横向き表示の扱いはOSとブラウザによります。</p><p>ブラウザの普通のタブや、ダウンロードしたHTMLを開いただけでは、インストール版の表示にはなりません。アプリの保存はこの配信元とブラウザ内に限られ、別の配信元やダウンロード版とは自動で引き継がれません。</p><p id="pwaHelpStatus" role="status"></p><p>初回は通信できる状態で開き、オフライン用データの保存完了を確認してください。端末が容量整理でデータを削除した場合は、再び接続して開く必要があります。</p>';
    parent.appendChild(section); updateStatus(status);
  }
  helpButton.addEventListener('click',renderHelp);
  installButton.addEventListener('click',async () => {
    if (!deferred) { helpButton.click(); return; }
    const prompt=deferred; deferred=null; installButton.textContent='アプリ';
    try { await prompt.prompt(); await prompt.userChoice; } catch { helpButton.click(); }
  });
  window.addEventListener('beforeinstallprompt',event => { event.preventDefault(); deferred=event; installButton.textContent='インストール'; });
  window.addEventListener('appinstalled',()=>{deferred=null;installButton.remove();updateStatus('追加したホーム画面のアイコンから開いてください。');});
  function checkOffline(active) {
    if (!active || typeof MessageChannel !== 'function') return;
    const channel=new MessageChannel();
    const timer=setTimeout(()=>{channel.port1.close();},5000);
    channel.port1.onmessage=event=>{
      if(event.data?.type!=='OFFLINE_STATUS')return;
      clearTimeout(timer);channel.port1.close();
      if(registration?.waiting)updateStatus('新しい版の準備ができました。保存を確認し、すべてのアプリ画面を閉じて開き直すと適用できます。戦闘中の自動再読み込みはしません。');
      else updateStatus(event.data.ready?'オフライン用データを保存済みです。':'オフライン準備は未完了です。通信できる状態で開き直してください。');
    };
    active.postMessage({type:'CHECK_OFFLINE'},[channel.port2]);
  }
  if (!('serviceWorker' in navigator) || location.protocol !== 'https:') {
    updateStatus('この表示環境ではアプリのオフライン準備を利用できません。配信されたHTTPSのURLをChromeやSafariで直接開いてください。');return;
  }
  navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(async reg=>{
    registration=reg;
    const noteWaiting=()=>{if(reg.waiting)updateStatus('新しい版の準備ができました。保存を確認し、すべてのアプリ画面を閉じて開き直してください。戦闘中には再読み込みしません。');};
    noteWaiting();
    reg.addEventListener('updatefound',()=>{const worker=reg.installing;if(worker)worker.addEventListener('statechange',noteWaiting);});
    reg.update().catch(()=>{});
    const ready=await navigator.serviceWorker.ready;
    if(ready.scope===new URL('./',location.href).href)checkOffline(ready.active);
  }).catch(()=>updateStatus('オフライン用データの保存に失敗しました。通信できる状態で開き直してください。ゲームはこのまま遊べます。'));
})();

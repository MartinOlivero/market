// Webhooks n8n (ajustá si cambian)
const PROMPT_GENERATION_WEBHOOK_URL = "https://n8n.iamautom.com/webhook-test/228a70a2-4547-479a-ad70-1c63030ee627";
const CREATE_VIDEO_WEBHOOK_URL      = "https://n8n.iamautom.com/webhook-test/fd814769-4357-4862-b216-d2ddeda4959c";
const VIDEO_STATUS_WEBHOOK_URL      = "https://n8n.iamautom.com/webhook-test/747cfa45-8142-438d-9cac-fee92c30d213";

document.addEventListener('DOMContentLoaded', () => {
  // DOM
  const mainContent = document.getElementById('main-content');
  const form = document.getElementById('n8n-form');
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const imagePreview = document.getElementById('image-preview');
  const uploadPrompt = document.getElementById('upload-prompt');
  const urlInput = document.getElementById('url-input');
  const fetchButton = document.getElementById('fetch-button');
  const fetchButtonText = document.getElementById('fetch-button-text');
  const fetchSpinner = document.getElementById('fetch-spinner');
  const urlFeedback = document.getElementById('url-feedback');
  const urlPreviewContainer = document.getElementById('url-preview-container');
  const urlPreviewPlaceholder = document.getElementById('url-preview-placeholder');
  const urlPreviewImg = document.getElementById('url-preview-img');

  const analyzeSection = document.getElementById('analyze-section');
  const analyzeButton = document.getElementById('analyze-button');
  const analyzeButtonText = document.getElementById('analyze-button-text');
  const analyzeSpinner = document.getElementById('analyze-spinner');

  const videoSizeSection = document.getElementById('video-size-section');
  const aspectRatioSelect = document.getElementById('aspect-ratio-select');

  const advancedOptionsSection = document.getElementById('advanced-options-section');
  const modelSelect = document.getElementById('model-select');
  const seedInput = document.getElementById('seed-input');
  const watermarkInput = document.getElementById('watermark-input');

  const promptSection = document.getElementById('prompt-section');
  const promptOptionsContainer = document.getElementById('prompt-options-container');

  const submitButton = document.getElementById('submit-button');
  const buttonText = document.getElementById('button-text');
  const loadingSpinner = document.getElementById('loading-spinner');
  const statusMessage = document.getElementById('status-message');

  const checkProgressSection = document.getElementById('check-progress-section');
  const jobIdDisplay = document.getElementById('job-id-display');
  const checkProgressButton = document.getElementById('check-progress-button');
  const checkProgressText = document.getElementById('check-progress-text');
  const checkProgressSpinner = document.getElementById('check-progress-spinner');
  const startOverButton = document.getElementById('start-over-button');

  const videoModal = document.getElementById('video-modal');
  const videoModalPanel = document.getElementById('video-modal-panel');
  const videoPlayer = document.getElementById('video-player');
  const closeModalButton = document.getElementById('close-modal-button');
  const resizeVideoButton = document.getElementById('resize-video-button');

  // Estado
  let currentJobId = null;
  let appState = { image:null, source:null, prompt:null };

  // Helpers UI
  function setFetchLoading(b){ fetchButton.disabled=b; fetchButtonText.classList.toggle('hidden', b); fetchSpinner.classList.toggle('hidden', !b); }
  function setAnalyzeLoading(b){ analyzeButton.disabled=b; analyzeButtonText.classList.toggle('hidden', b); analyzeSpinner.classList.toggle('hidden', !b); }
  function setLoading(b){ submitButton.disabled=b; buttonText.classList.toggle('hidden', b); loadingSpinner.classList.toggle('hidden', !b); }
  function setCheckProgressLoading(b){ checkProgressButton.disabled=b; checkProgressText.classList.toggle('hidden', b); checkProgressSpinner.classList.toggle('hidden', !b); }

  function showStatus(message, type){
    statusMessage.textContent = message;
    statusMessage.className = 'text-center text-sm';
    if(type==='success') statusMessage.classList.add('text-emerald-400');
    if(type==='error')   statusMessage.classList.add('text-rose-400');
    if(type==='loading') statusMessage.classList.add('text-sky-400');
  }

  function clearUrlState(){
    urlPreviewImg.src=''; urlPreviewImg.classList.add('hidden');
    urlPreviewPlaceholder.classList.remove('hidden');
    urlFeedback.textContent = 'Ingresá una URL y hacé clic en “Obtener imagen”.';
    urlFeedback.className = 'mt-2 text-xs text-white/60 h-8';
  }

  function handleImageSelection(){
    promptSection.classList.add('hidden');
    videoSizeSection.classList.add('hidden');
    advancedOptionsSection.classList.add('hidden');
    analyzeSection.classList.remove('hidden');
    submitButton.disabled = true;
  }

  function handleFile(file){
    if(!file || !file.type.match('image/(jpeg|png|webp)')){
      showStatus('Elegí un archivo JPG, PNG o WEBP.', 'error'); return;
    }
    urlInput.value=''; clearUrlState();
    appState.source='upload';
    const reader = new FileReader();
    reader.onload = (e)=>{
      imagePreview.src = e.target.result;
      imagePreview.classList.remove('hidden');
      uploadPrompt.classList.add('hidden');
      appState.image = e.target.result;
      handleImageSelection();
    };
    reader.readAsDataURL(file);
  }

  // Drag & drop
  dropZone.addEventListener('dragover', (e)=>{ e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', ()=> dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e)=>{
    e.preventDefault(); dropZone.classList.remove('dragover');
    if(e.dataTransfer.files.length){ fileInput.files = e.dataTransfer.files; handleFile(e.dataTransfer.files[0]); }
  });
  fileInput.addEventListener('change', ()=> handleFile(fileInput.files[0]));

  // Obtener imagen desde URL
  fetchButton.addEventListener('click', async ()=>{
    const url = urlInput.value.trim();
    if(!url){ showStatus('Ingresá una URL primero.', 'error'); return; }
    try{ new URL(url); }catch{ showStatus('Ingresá una URL válida.', 'error'); return; }

    setFetchLoading(true);
    urlFeedback.textContent = 'Buscando imagen...';
    urlFeedback.className = 'mt-2 text-xs text-sky-400 h-8';

    fileInput.value=''; imagePreview.src=''; imagePreview.classList.add('hidden'); uploadPrompt.classList.remove('hidden');

    try{
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if(!response.ok) throw new Error(`No se pudo obtener la URL (status ${response.status})`);
      const htmlText = await response.text();
      const doc = new DOMParser().parseFromString(htmlText,'text/html');
      const ogImageTag = doc.querySelector('meta[property="og:image"]');

      if(ogImageTag && ogImageTag.content){
        const imageUrl = new URL(ogImageTag.content, url).href;
        appState.image = imageUrl; appState.source = 'url';
        urlPreviewImg.src = imageUrl; urlPreviewImg.classList.remove('hidden');
        urlPreviewPlaceholder.classList.add('hidden');
        urlFeedback.textContent = '✅ ¡Listo! Se encontró la imagen.';
        urlFeedback.className = 'mt-2 text-xs text-emerald-400 h-8';
        handleImageSelection();
      }else{
        throw new Error('La página no tiene meta og:image.');
      }
    }catch(error){
      console.error('Fetch error:', error);
      urlFeedback.textContent = `❌ Error: ${error.message}`;
      urlFeedback.className = 'mt-2 text-xs text-rose-400 h-8';
      appState.image=null; appState.source=null; clearUrlState();
    }finally{
      setFetchLoading(false);
    }
  });

  // Analizar imagen (prompts)
  analyzeButton.addEventListener('click', async ()=>{
    if(!PROMPT_GENERATION_WEBHOOK_URL){ showStatus('Falta configurar el Webhook de generación de prompts.', 'error'); return; }
    if(!appState.image){ showStatus('Cargá una imagen primero.', 'error'); return; }

    setAnalyzeLoading(true);
    showStatus('Analizando imagen...', 'loading');

    try{
      const response = await fetch(PROMPT_GENERATION_WEBHOOK_URL,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ image:appState.image, source:appState.source })
      });
      if(!response.ok) throw new Error(`El servidor respondió con status ${response.status}`);

      const contentType = response.headers.get("content-type");
      if(!contentType || !contentType.includes("application/json")){
        const errorText = await response.text();
        console.error("Respuesta no-JSON del webhook:", errorText);
        throw new TypeError("El webhook devolvió un contenido no-JSON. Revisá el flujo en n8n.");
      }

      let data = await response.json();
      if(Array.isArray(data) && data.length>0) data = data[0];
      let promptData = data.json || data;

      if(promptData && promptData.music_prompt && promptData.voiceover_prompt){
        renderPromptOptions(promptData);
        videoSizeSection.classList.remove('hidden');
        advancedOptionsSection.classList.remove('hidden');
        promptSection.classList.remove('hidden');
        analyzeSection.classList.add('hidden');
        showStatus('✅ Análisis completo. Elegí un prompt.', 'success');
      }else{
        throw new Error("Faltan 'music_prompt' o 'voiceover_prompt' en la respuesta.");
      }
    }catch(error){
      console.error('Prompt generation error:', error);
      showStatus(`❌ Error obteniendo prompts: ${error.message}`, 'error');
    }finally{
      setAnalyzeLoading(false);
    }
  });

  function renderPromptOptions(prompts){
    const musicPrompt = prompts.music_prompt;
    const voiceoverPrompt = prompts.voiceover_prompt;

    promptOptionsContainer.innerHTML = `
      <div class="relative">
        <input type="radio" name="prompt_choice" id="prompt-music" value="${musicPrompt}" class="hidden prompt-card-radio">
        <label for="prompt-music" class="block p-4 border border-white/15 rounded-lg cursor-pointer hover:border-indigo-400 transition-colors glass-soft">
          <span class="font-semibold">Video con música</span>
          <p class="text-sm text-white/70 mt-1">${musicPrompt}</p>
        </label>
      </div>
      <div class="relative">
        <input type="radio" name="prompt_choice" id="prompt-ai" value="${voiceoverPrompt}" class="hidden prompt-card-radio">
        <label for="prompt-ai" class="block p-4 border border-white/15 rounded-lg cursor-pointer hover:border-indigo-400 transition-colors glass-soft">
          <span class="font-semibold">Video con voz en off</span>
          <p class="text-sm text-white/70 mt-1">${voiceoverPrompt}</p>
        </label>
      </div>
      <div>
        <div class="relative">
          <input type="radio" name="prompt_choice" id="prompt-custom-radio" value="custom" class="hidden prompt-card-radio">
          <label for="prompt-custom-radio" class="block p-4 border border-white/15 rounded-lg cursor-pointer hover:border-indigo-400 transition-colors glass-soft">
            <span class="font-semibold">Escribí tu propio prompt</span>
            <p class="text-sm text-white/70 mt-1">Ingresalo manualmente en el campo de abajo.</p>
          </label>
        </div>
        <textarea id="custom-prompt-textarea" rows="4" class="mt-3 block w-full input disabled:opacity-60" placeholder="Ej.: Hacé que la persona de la imagen hable..." disabled></textarea>
      </div>
    `;
    promptOptionsContainer.addEventListener('change', handlePromptSelection);
  }

  function handlePromptSelection(e){
    const customTextarea = document.getElementById('custom-prompt-textarea');
    if(e.target.name === 'prompt_choice'){
      const isCustom = e.target.value === 'custom';
      customTextarea.disabled = !isCustom;
      if(isCustom){ customTextarea.focus(); appState.prompt = customTextarea.value; }
      else{ appState.prompt = e.target.value; }
      submitButton.disabled = !appState.prompt;
    }
  }

  promptOptionsContainer.addEventListener('input', (e)=>{
    if(e.target.id === 'custom-prompt-textarea'){
      appState.prompt = e.target.value;
      submitButton.disabled = !appState.prompt;
    }
  });

  // Crear video
  submitButton.addEventListener('click', async ()=>{
    if(!CREATE_VIDEO_WEBHOOK_URL){ showStatus('Falta configurar el Webhook principal.', 'error'); return; }
    if(!appState.image){ showStatus('Subí una imagen o pegá una URL.', 'error'); return; }
    if(!appState.prompt || appState.prompt.trim()===''){ showStatus('Elegí o escribí un prompt.', 'error'); return; }

    setLoading(true);
    showStatus('Iniciando la creación del video...', 'loading');

    const payload = {
      image: appState.image,
      source: appState.source,
      prompt: appState.prompt.trim(),
      aspect_ratio: aspectRatioSelect.value,
      model: modelSelect.value,
      seed: seedInput.value.trim(),
      watermark: watermarkInput.value.trim()
    };
    if(payload.seed==='') delete payload.seed;
    if(payload.watermark==='') delete payload.watermark;

    try{
      const initialResponse = await fetch(CREATE_VIDEO_WEBHOOK_URL,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload)
      });
      if(!initialResponse.ok) throw new Error(`Falló la solicitud inicial (status ${initialResponse.status})`);

      let data = await initialResponse.json();
      if(Array.isArray(data) && data.length>0) data = data[0];
      currentJobId = data.job_id || data.json?.job_id;
      if(!currentJobId) throw new Error("El servidor no devolvió 'job_id'.");

      jobIdDisplay.textContent = `Job ID: ${currentJobId}`;
      mainContent.classList.add('hidden');
      checkProgressSection.classList.remove('hidden');
      statusMessage.textContent = '';
    }catch(error){
      console.error('Error starting video creation:', error);
      showStatus(`❌ Error: ${error.message}. Mirá la consola para más detalles.`, 'error');
    }finally{
      setLoading(false);
    }
  });

  // Ver estado
  checkProgressButton.addEventListener('click', async ()=>{
    if(!VIDEO_STATUS_WEBHOOK_URL){ showStatus('Falta configurar el Webhook de estado.', 'error'); return; }
    if(!currentJobId){ showStatus('No hay un trabajo activo.', 'error'); return; }

    setCheckProgressLoading(true);
    showStatus('Consultando estado...', 'loading');

    try{
      const statusResponse = await fetch(VIDEO_STATUS_WEBHOOK_URL,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ job_id: currentJobId })
      });
      if(!statusResponse.ok) throw new Error(`No se pudo consultar el estado (status ${statusResponse.status})`);

      const statusData = await statusResponse.json();
      if(Array.isArray(statusData) && statusData.length>0 && statusData[0].video_url){
        const videoUrl = statusData[0].video_url;
        videoModalPanel.classList.remove('sm:max-w-4xl','sm:max-w-7xl','sm:max-w-2xl');
        videoModalPanel.classList.add('sm:max-w-xl');
        videoPlayer.src = videoUrl;
        videoModal.classList.remove('hidden');
        showStatus('✅ ¡Video creado con éxito!', 'success');
        resetState();
      }else{
        showStatus('El video todavía no está listo. Probá de nuevo en un momento.', 'loading');
      }
    }catch(error){
      console.error('Polling error:', error);
      showStatus(`❌ Error consultando el estado: ${error.message}`, 'error');
    }finally{
      setCheckProgressLoading(false);
    }
  });

  startOverButton.addEventListener('click', resetState);

  closeModalButton.addEventListener('click', ()=>{
    videoModal.classList.add('hidden'); videoPlayer.src='';
  });
  resizeVideoButton.addEventListener('click', ()=>{
    if(videoModalPanel.classList.contains('sm:max-w-xl')){
      videoModalPanel.classList.remove('sm:max-w-xl'); videoModalPanel.classList.add('sm:max-w-4xl');
    }else if(videoModalPanel.classList.contains('sm:max-w-4xl')){
      videoModalPanel.classList.remove('sm:max-w-4xl'); videoModalPanel.classList.add('sm:max-w-7xl');
    }else{
      videoModalPanel.classList.remove('sm:max-w-7xl'); videoModalPanel.classList.add('sm:max-w-xl');
    }
  });

  function resetState(){
    form.reset();
    mainContent.classList.remove('hidden');
    checkProgressSection.classList.add('hidden');
    imagePreview.classList.add('hidden');
    uploadPrompt.classList.remove('hidden');
    fileInput.value='';
    clearUrlState();
    analyzeSection.classList.add('hidden');
    videoSizeSection.classList.add('hidden');
    advancedOptionsSection.classList.add('hidden');
    promptSection.classList.add('hidden');
    submitButton.disabled = true;
    currentJobId = null;
    appState = { image:null, source:null, prompt:null };
    setTimeout(()=>{ showStatus('', null); }, 5000);
  }
});

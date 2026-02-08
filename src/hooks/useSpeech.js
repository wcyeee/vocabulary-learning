import { useCallback, useEffect } from 'react'

export function useSpeech() {
  // 預熱機制：頁面載入時先叫瀏覽器準備好語音清單
  useEffect(() => {
    const synth = window.speechSynthesis;
    // 觸發加載語音清單
    synth.getVoices();
    // 有些瀏覽器需要監聽這個事件
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = synth.getVoices;
    }
  }, []);

  const speak = useCallback((text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // 強制挑選高品質聲音
    const voices = window.speechSynthesis.getVoices();
    // 優先找名字裡有 "Google" 的，因為那是 Chrome 提供的高品質雲端聲音
    const bestVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) 
                   || voices.find(v => v.lang === 'en-US');

    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
  }, []);

  return { speak, stop };
}
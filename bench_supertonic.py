import time
from pathlib import Path

from supertonic import TTS

TEXT = (
    "Di dunia yang diliputi bintang khayal, kabut imajinasi, nama-nama dan impian, "
    "tak semua kenyataan lahir dari bayangan, sebagaimana tak semua bayangan lahir dari kenyataan. "
    "Kita hidup di dunia ketiga dari matahari, demikian Bob Perelman dalam sebaris sajak "
    "yang tak kepalang menghentak."
)

out = Path(__file__).parent / "audio"
out.mkdir(exist_ok=True)

t0 = time.time()
tts = TTS(auto_download=True)
t_load = time.time() - t0

style = tts.get_voice_style(voice_name="M1")

t0 = time.time()
wav, dur = tts.synthesize(
    text=TEXT,
    lang="id",
    voice_style=style,
    total_steps=8,
    speed=1.0,
)
t_gen = time.time() - t0

audio_sec = float(dur[0])
tts.save_audio(wav, str(out / "supertonic-id.wav"))

print(f"supertonic load: {t_load:.1f}s")
print(f"supertonic gen:  {t_gen:.1f}s for {audio_sec:.1f}s audio (RTF {t_gen / audio_sec:.2f})")
print(f"saved: {out / 'supertonic-id.wav'}")

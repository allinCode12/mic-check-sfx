import { SFXSound, BGMTrack } from '../types';

// Import SFX Files
import sfx1 from '../DigiSoundboard/SFX/1. Eerie shattering noise.mp3';
import sfx2 from '../DigiSoundboard/SFX/2. Shining sfx.mp3';
import sfx3 from '../DigiSoundboard/SFX/3. Wooshing.mp3';
import sfx4 from '../DigiSoundboard/SFX/4. Wooshing plane like sound.mp3';
import sfx5 from '../DigiSoundboard/SFX/5. LOUD SOUND.mp3';
import sfx6 from '../DigiSoundboard/SFX/6. Ringing.mp3';
import sfx7 from '../DigiSoundboard/SFX/7. Light smacking noises.mp3';
import sfx8 from '../DigiSoundboard/SFX/8. Heavy thud.mp3';
import sfx10 from '../DigiSoundboard/SFX/10. ECG flatline.mp3';
import sfx11 from '../DigiSoundboard/SFX/11. Scream fades to a shock, then breathing.mp3';
import sfx12 from '../DigiSoundboard/SFX/12. Lightning strike.mp3';
import sfx13 from '../DigiSoundboard/SFX/13. Metal sheathing.mp3';
import sfx14 from '../DigiSoundboard/SFX/14. Thunder Flash.mp3';
import sfx15 from '../DigiSoundboard/SFX/15. Metal ting.mp3';
import sfx16 from '../DigiSoundboard/SFX/16. Clock ticking sounds.mp3';
import sfx17 from '../DigiSoundboard/SFX/17. Knocking on door sounds.mp3';
import sfx18 from '../DigiSoundboard/SFX/18. Eerie noises.mp3';
import sfx19 from '../DigiSoundboard/SFX/19. WOOSHING SOUND.mp3';
import sfx20 from '../DigiSoundboard/SFX/20. Metal slash, then cutting sounds.mp3';
import sfx21 from '../DigiSoundboard/SFX/21. Metal clink.mp3';
import sfx22 from '../DigiSoundboard/SFX/22. Air current sfx.mp3';
import sfx23 from '../DigiSoundboard/SFX/23. Whooshing sound.mp3';
import sfx24 from '../DigiSoundboard/SFX/24. Bang.mp3';
import sfx25 from '../DigiSoundboard/SFX/25. Heavy metal clink.mp3';
import sfx26 from '../DigiSoundboard/SFX/26. Multiple metal clashes.mp3';
import sfx27 from '../DigiSoundboard/SFX/27. Fire clashing sounds.mp3';
import sfx28 from '../DigiSoundboard/SFX/28. Metal clashing.mp3';
import sfx29 from '../DigiSoundboard/SFX/29. Hollow purple.mp3';
import sfx30 from '../DigiSoundboard/SFX/30. Wooshing sounds (final).mp3';

// Import BGM Files
import bgmBlueDrops2 from '../DigiSoundboard/BGM/Blue Drops (2nd Mix).mp3';
import bgmBlueDropsUnder1 from '../DigiSoundboard/BGM/Blue_Drops_under_1MB.mp3';
import bgmDayByDay from '../DigiSoundboard/BGM/Day By Day.mp3';
import bgmHundredDays from '../DigiSoundboard/BGM/Hundred Days.mp3';
import bgmOutgoingHope from '../DigiSoundboard/BGM/Outgoing Hope.mp3';
import bgmSinkingWorld from '../DigiSoundboard/BGM/Sinking World.mp3';
import bgmTheConfronters from '../DigiSoundboard/BGM/The Confronters.mp3';
import bgmAd1 from '../DigiSoundboard/BGM/Ad 1 (mx3).mp3';
import bgmAd2 from '../DigiSoundboard/BGM/Ad 2 (white rose papaya).mp3';
import bgmStationId from '../DigiSoundboard/BGM/Station ID (win radio).mp3';

const colors: SFXSound['color'][] = ['cyan', 'magenta', 'yellow', 'green', 'rose', 'amber', 'blue', 'purple'];

const rawSFX = [
  { file: sfx1, name: '1. Eerie shattering noise' },
  { file: sfx2, name: '2. Shining sfx' },
  { file: sfx3, name: '3. Wooshing' },
  { file: sfx4, name: '4. Wooshing plane like sound' },
  { file: sfx5, name: '5. LOUD SOUND' },
  { file: sfx6, name: '6. Ringing' },
  { file: sfx7, name: '7. Light smacking noises' },
  { file: sfx8, name: '8. Heavy thud' },
  { file: sfx10, name: '10. ECG flatline' },
  { file: sfx11, name: '11. Scream fades to a shock, then breathing' },
  { file: sfx12, name: '12. Lightning strike' },
  { file: sfx13, name: '13. Metal sheathing' },
  { file: sfx14, name: '14. Thunder Flash' },
  { file: sfx15, name: '15. Metal ting' },
  { file: sfx16, name: '16. Clock ticking sounds' },
  { file: sfx17, name: '17. Knocking on door sounds' },
  { file: sfx18, name: '18. Eerie noises' },
  { file: sfx19, name: '19. WOOSHING SOUND' },
  { file: sfx20, name: '20. Metal slash, then cutting sounds' },
  { file: sfx21, name: '21. Metal clink' },
  { file: sfx22, name: '22. Air current sfx' },
  { file: sfx23, name: '23. Whooshing sound' },
  { file: sfx24, name: '24. Bang' },
  { file: sfx25, name: '25. Heavy metal clink' },
  { file: sfx26, name: '26. Multiple metal clashes' },
  { file: sfx27, name: '27. Fire clashing sounds' },
  { file: sfx28, name: '28. Metal clashing' },
  { file: sfx29, name: '29. Hollow purple' },
  { file: sfx30, name: '30. Wooshing sounds (final)' },
];

export const PRESET_SOUNDS: SFXSound[] = rawSFX.map((item, index) => {
  // Shortcut keys: '1'-'9' for the first 9, '0' for the 10th, and empty for the rest
  let keyShortcut = '';
  if (index < 9) {
    keyShortcut = String(index + 1);
  } else if (index === 9) {
    keyShortcut = '0';
  }

  return {
    id: `snd_preset_${index + 1}`,
    name: item.name,
    color: colors[index % colors.length],
    keyShortcut,
    isLooping: false,
    volume: 0.75,
    isCustom: false,
    url: item.file,
    playCount: 0,
    order: index,
  };
});

export const PRESET_TRACKS: BGMTrack[] = [
  { id: 'bgm_blue_drops_2nd_mix', name: 'Blue Drops (2nd Mix)', isCustom: false, url: bgmBlueDrops2 },
  { id: 'bgm_blue_drops_under_1mb', name: 'Blue_Drops_under_1MB', isCustom: false, url: bgmBlueDropsUnder1 },
  { id: 'bgm_day_by_day', name: 'Day By Day', isCustom: false, url: bgmDayByDay },
  { id: 'bgm_hundred_days', name: 'Hundred Days', isCustom: false, url: bgmHundredDays },
  { id: 'bgm_outgoing_hope', name: 'Outgoing Hope', isCustom: false, url: bgmOutgoingHope },
  { id: 'bgm_sinking_world', name: 'Sinking World', isCustom: false, url: bgmSinkingWorld },
  { id: 'bgm_the_confronters', name: 'The Confronters', isCustom: false, url: bgmTheConfronters },
  { id: 'bgm_ad_1_mx3', name: 'Ad 1 (mx3)', isCustom: false, url: bgmAd1 },
  { id: 'bgm_ad_2_white_rose_papaya', name: 'Ad 2 (white rose papaya)', isCustom: false, url: bgmAd2 },
  { id: 'bgm_station_id_win_radio', name: 'Station ID (win radio)', isCustom: false, url: bgmStationId },
  { id: 'procedural_cosmic_drone', name: 'Ambient Cosmic Drone 🌌 (Synth)', isCustom: false },
];

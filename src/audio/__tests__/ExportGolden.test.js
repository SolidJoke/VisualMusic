import { describe, it, expect } from "vitest";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { Midi } from "@tonejs/midi";
import { exportDrums, exportChords, exportBass } from "../MidiExporter";
import { BRICKS, GOLDEN_BPM, THEMES, SPECIAL_CASES, studioState } from "./goldenCases";

/**
 * T1 golden — the MIDI export, byte for byte (VMU-137, entry of VMU-116).
 *
 * T1 rewires MidiExporter.js to read "what plays on this step" from the one
 * pure function playback also reads (src/audio/dispatch.js), instead of
 * recomputing each measure's chord on its own. That move must change nothing
 * a user can download. These are the SHA-256 fingerprints of the three files
 * SequencerPanel.jsx exports (drums, chords, bass), for every style in both
 * themes plus the brief's particular cases, **frozen from `main` at d277303,
 * before the move**. A refactor that alters one byte of one file fails here.
 *
 * Each file is exported with the arguments SequencerPanel.jsx passes (the
 * genre-name argument is ignored by the exporter; a constant is passed), at a
 * fixed tempo so a fingerprint does not depend on a style's bpm.
 *
 * If a fingerprint here ever has to change, that is a behaviour change of the
 * export, not a refactor: it needs its own ticket and its own review, and the
 * old value belongs in that commit's message.
 */

function sha256(arrayLike) {
  return createHash("sha256").update(Buffer.from(arrayLike)).digest("hex");
}

/** The three files SequencerPanel.jsx would export for this state, fingerprinted. */
function fingerprints(state) {
  return {
    drums: sha256(exportDrums(state.drums, GOLDEN_BPM, "Genre")),
    chords: sha256(
      exportChords(state.brick, state.progression, state.rhythm, state.octaveOffset, GOLDEN_BPM, "Genre"),
    ),
    bass: sha256(exportBass(state.melody, state.brick, state.progression, GOLDEN_BPM)),
  };
}

/** Every case: 27 styles x themes A and B, then the particular cases. */
function allCases() {
  const cases = [];
  BRICKS.forEach((brick, index) => {
    THEMES.forEach((theme) => {
      cases.push([`${index}:${theme} ${brick.name.en}`, () => studioState(index, theme)]);
    });
  });
  Object.entries(SPECIAL_CASES).forEach(([name, build]) => cases.push([name, build]));
  return cases;
}

// Frozen from main at d277303 (before T1). [drums, chords, bass].
const GOLDEN = {
  "0:A Modern Pop (4 Chords)": [
    "94a82ddbdc46fbd849a83bce8808d83da9eed42f14d3dd79b4603cc6c5d963b2",
    "9549754b781fb6fc49f369c7de22d512febbc49ce118cffa07c3d96852566aaa",
    "4e6ea3749ee4802f4ac2dbd0c89e560571a7ac60b27b299a4d527b0e76ef683d",
  ],
  "0:B Modern Pop (4 Chords)": [
    "94a82ddbdc46fbd849a83bce8808d83da9eed42f14d3dd79b4603cc6c5d963b2",
    "9549754b781fb6fc49f369c7de22d512febbc49ce118cffa07c3d96852566aaa",
    "4e6ea3749ee4802f4ac2dbd0c89e560571a7ac60b27b299a4d527b0e76ef683d",
  ],
  "1:A Rock / Blues (Basic)": [
    "94a82ddbdc46fbd849a83bce8808d83da9eed42f14d3dd79b4603cc6c5d963b2",
    "105d02855cfb0e321172f5f44a6a746eb8bbd1f415703103dc33d6869821d02d",
    "8422e2dcc438b9534d42104a58dbcc568407f04027ae2450a1ed00816aaa6aa6",
  ],
  "1:B Rock / Blues (Basic)": [
    "94a82ddbdc46fbd849a83bce8808d83da9eed42f14d3dd79b4603cc6c5d963b2",
    "105d02855cfb0e321172f5f44a6a746eb8bbd1f415703103dc33d6869821d02d",
    "8422e2dcc438b9534d42104a58dbcc568407f04027ae2450a1ed00816aaa6aa6",
  ],
  "2:A Doo-Wop Ballad (50s)": [
    "94a82ddbdc46fbd849a83bce8808d83da9eed42f14d3dd79b4603cc6c5d963b2",
    "1bc49d5cb0bfc52ae60eff697db237fee68aa5cebd68d1760d0e9fb19ab7f061",
    "0300601cba7baef9c58a7414825e862db71c8151f23edea65fe30ca44f328332",
  ],
  "2:B Doo-Wop Ballad (50s)": [
    "94a82ddbdc46fbd849a83bce8808d83da9eed42f14d3dd79b4603cc6c5d963b2",
    "1bc49d5cb0bfc52ae60eff697db237fee68aa5cebd68d1760d0e9fb19ab7f061",
    "0300601cba7baef9c58a7414825e862db71c8151f23edea65fe30ca44f328332",
  ],
  "3:A Funk/Disco Loop": [
    "0628bafec7f8e52576648fff0a2b602315fc7de5b341ae2f47e31c84efcaf8ed",
    "c8f0b858fbe0e485cf8ed8be15ae5f8d63e54b8d60025cc568cbb6ef74e08841",
    "df883810c27e1280bc54f005bdbc59adf14703fbdaf2ad0cf2775ded39ad30cb",
  ],
  "3:B Funk/Disco Loop": [
    "0628bafec7f8e52576648fff0a2b602315fc7de5b341ae2f47e31c84efcaf8ed",
    "c8f0b858fbe0e485cf8ed8be15ae5f8d63e54b8d60025cc568cbb6ef74e08841",
    "df883810c27e1280bc54f005bdbc59adf14703fbdaf2ad0cf2775ded39ad30cb",
  ],
  "4:A Jazz Turnaround (ii-V-I)": [
    "94a82ddbdc46fbd849a83bce8808d83da9eed42f14d3dd79b4603cc6c5d963b2",
    "02d708153f12b4892811f428770c618475787d7dd85c6257444d89ced3f8bfc0",
    "7948947c1fbb58d452e39819d93e8378404cdd278efbadc4cc28773e5be2de5e",
  ],
  "4:B Jazz Turnaround (ii-V-I)": [
    "94a82ddbdc46fbd849a83bce8808d83da9eed42f14d3dd79b4603cc6c5d963b2",
    "02d708153f12b4892811f428770c618475787d7dd85c6257444d89ced3f8bfc0",
    "7948947c1fbb58d452e39819d93e8378404cdd278efbadc4cc28773e5be2de5e",
  ],
  "5:A Euphoric Techno": [
    "034b6b75f9d595439327d0d152e398213f00acffae339f7ff3ae44370141ae84",
    "d166d5473b235f19b3ce22a381a2ff5cdbb4d1b138ab81d0a8f9d30abe9241ea",
    "3f7ad9fd6491261c4c2420096cdcb9f13bd23738452a0a601427af18115ae48b",
  ],
  "5:B Euphoric Techno": [
    "0628bafec7f8e52576648fff0a2b602315fc7de5b341ae2f47e31c84efcaf8ed",
    "e760c7684e770bc8ace9e4d75c76afa8b14b50e811c17a443b0ac40312813e67",
    "4c3b3877b283a1392d3ea43eb673083b3371c8da7b6089bd606c1511292bb66f",
  ],
  "6:A Nostalgic Psytrance": [
    "caac6d9fc5e6f6c9318f5657a4565d1c19f7f1c3ec925e26e3446cbd310989cc",
    "e49528f7b42c633a81eb0e990a7e842d19d8ba0cf145bce7f5937f26f90ae351",
    "a30342c6917c13eb345f602f0a9c7041195f1f0a179e5720360afe8c45e21aa6",
  ],
  "6:B Nostalgic Psytrance": [
    "034b6b75f9d595439327d0d152e398213f00acffae339f7ff3ae44370141ae84",
    "14c109bce2c6904277349e7716d4ea27e13d70c4c5e525f6176d0dc0ed745588",
    "82d2f695ed5ded192c8acf96f4db96cbf47271c4c8d1be5ea0c11c534630f3c4",
  ],
  "7:A Epic Metal": [
    "8ca8c83643dc1616671000ece822ef4b0881a1d6bbc906b0ec83d60c6a591583",
    "6e6a7974d767e92b4468b3161e18bd904cf67756aaed8a8c9a9a2b54a24dae56",
    "552cc075dc987f75f5d262c8236579d1847192cb2495eb599342ed56bb66ca63",
  ],
  "7:B Epic Metal": [
    "420189ffc0f8b6d46332fd9d70ac46e0f89b68c11c1bc6281a2d717f95873221",
    "ab3ae6906a7288cf9bad327db3a2e79cbb9d40bff721c0439a1221912838424f",
    "b4fc7e25fb3aa2f852abd6c1cef2aa8f85842d0cb6a70c5cff9ddba230067918",
  ],
  "8:A Joyful Reggae": [
    "752e6c248c6e8d0e26d88676b8d4969150c13ebbaf1663812702cd89ee09de67",
    "c5c97aec419a0d97fe778f45c1fe31d8711c9dcef403bf311f9c064ea67f2086",
    "cc862624fd9f8519b06bfc10506ea6cb1b199040a78070ab4c992355fccd8fc1",
  ],
  "8:B Joyful Reggae": [
    "b34e410a02652843cce8c4bedb4721b1376d77a5f60a5b076152e839e73881ee",
    "00ee3cccb47b74ff12992f8496e014cd4c24139014ec00c56c46d3a56024c005",
    "d39c93670455c63fedfb336cedb1c26b068f475135d814a25a712574259f6546",
  ],
  "9:A Berlin School Ambient": [
    "9f280269c696ccefd2aa61882d1ac93f968bac76488efc122a84d409efedd261",
    "25e98abd858c6799a6fa59804b67aa2b0e81729878ea79a2dbe75fbcc3776649",
    "bb108b5c9258e278405691c30a3fe0c5c8ba43bad4ba22677af11ddabaa90558",
  ],
  "9:B Berlin School Ambient": [
    "41a888389ceefa9374a0a881ef08aa2eb7355049e200fa52dfec0efd9a0fee10",
    "4eac7876cbcf93170732058ecc532411f3b09e7b9f1270d2306f28f9e193bd64",
    "9743f17994f45bac77757ca0bb09d0d9a85eb348e81ce7dd2dac11f710324ca1",
  ],
  "10:A Oldschool Boom Bap": [
    "8d8ed1f44bbaf98a79f599c9f0f8351a6da21e15aaa3c67125d72187d6d823eb",
    "665dbed66107abf33e589b4c53760dd898a990a14bf98919ec85f9dc90a056b0",
    "c8ae0cc8d967d6f7e07db8d721517f1c622904c7657ba956196005354bdc9aef",
  ],
  "10:B Oldschool Boom Bap": [
    "8f20b528a09c8a74c737d939c8fecd3ee8828eea90f5642e303259e81c359011",
    "311d10c93319f7756ffc84bfa7ba3bef3d94acf5725448de7b6e1558b983e9b9",
    "7501063545bd1ad14c24a57a2abe6ed9a6973e9c537b46ac8d6d1f81dfdb9dad",
  ],
  "11:A Modern Trap": [
    "be88fd641cfe8c373c55298a9a0641ca6fbb0891e76983581e7806999ed88fac",
    "549d565a75d03478ddf89f9bef668de3ee70e9637a9b829a13dc753ab2ffffef",
    "52ebb05884448b9114a7dfa1851373639c143a85fdd23fad7218f19148900372",
  ],
  "11:B Modern Trap": [
    "f9e64bcb670e0febd5a033974263e79b81460f6482117f4fec97b21e499b8d74",
    "2ab8f3d2b7196eb2905db2c8784eb1c65397b82d015590341cbba625c3010d72",
    "b6a1717e9869d659c726ab46963e85061f845186d8be79ccee351acfa5c6acfb",
  ],
  "12:A Groovy Funk": [
    "13ca73a5d069892b6445a62f022974612ea66dbe1ac7206a528374dff6fcd32c",
    "cd877bec7796c920cf130ba7a439160b110e4c8c98263e2cacba5f56ce8bc32c",
    "58f3c9c868407e58a9f3ed0971d9e678c6735fe436f1854d38f5c0bc835e7a99",
  ],
  "12:B Groovy Funk": [
    "3509c91fcfa3d58810b53e73d8375fb67f4b1aaaa1dfde06003b568daf2b8820",
    "842f8cbe9a9e1d04f4546aa79eff5436eaf3e05c639ac84a7fdc94412bdffe51",
    "203f9ade655a58be24c201ba7e8c664b2cc468058665a33bc521509421315225",
  ],
  "13:A 60s Rock": [
    "94a82ddbdc46fbd849a83bce8808d83da9eed42f14d3dd79b4603cc6c5d963b2",
    "539ba2efd8017e209e7c386fdcb719f5cb1637e69a2ba07dfbabbcf38f3029d0",
    "48cbbe0c56b1bb8f81fb09c27ddd401f798897551a06b1f758623b7fc3ac4caf",
  ],
  "13:B 60s Rock": [
    "9a50aac170f98699e0552a9bd4b397e073804463d3cf63c0ef808e15144bdbcc",
    "73d101ddea6d9490a57a4296112f8f06a47746e411cd0050ba780e3d2b4f277c",
    "afe279d8362a3357eda2fca26748d481ff8ad03096b5b78896a5659bd88a1732",
  ],
  "14:A Progressive Rock": [
    "9715ec491354d589a6c78c2eda422afa05d032b6653deff1e35b382084808d47",
    "e07250b7fee0ceb7eda9737ecd11d1bec26b31336f6dc10cb7079d989db6424a",
    "e6703f7dfe711d2ce85d89afe2e634ca619eeb606a5b64800032fb5c359dc022",
  ],
  "14:B Progressive Rock": [
    "78e03828868185bbddcee7ebc8dbbcf9fd6644a8f8a9086a9b94ee43b141ad29",
    "0189e65cefb10bb721507b02696fda167a4e9a4c518bb1b54c6e91e5cec4b674",
    "7f677d95d6f6f7927b001fe4dc3eaba0abea61da1fc663de95158e58cffe7b0c",
  ],
  "15:A House": [
    "0628bafec7f8e52576648fff0a2b602315fc7de5b341ae2f47e31c84efcaf8ed",
    "916242b8fd2122e6db911ed0d7bdb7247f097b58d8edf8d59527bacffababb79",
    "20dbb60b6e96f1c77112657cf055b783c32381242e4c31fb6c208cfb42997826",
  ],
  "15:B House": [
    "b7e13eb0cc1c25880c4d3826d2bd3fde779a1b0c76765f8beac217dfe67c5431",
    "6a6fe0619131565ae300eb37fc003c2e86b3dca3af6660903a0e4bc46e2bd0b6",
    "412966bf955dfe1e79eaf46cd33510d4d2b63a6bc13242bb5696bd851907caf7",
  ],
  "16:A Groove Metal": [
    "0aff36e25993b22387bd7a852f42594fdad3b1e78b8d4bdd38006b24d047648b",
    "835195a9bc41e4ad1830a966b4e94a829a1721538fe8a446d3a01b2900f2489e",
    "b83d4503f8a26dbd84355d92737802491754dc3c7425f7548b3ce564b33b691e",
  ],
  "16:B Groove Metal": [
    "dd0ecb0b0d35c37921aa22ba0355f4d11db9792bb23ca4cda94b21fe88acdac7",
    "2e413112ffa904a8b9ba6346237a72476e8654eab51809e8d3d5c011eb051948",
    "04d5f94cbe25d39471f3e15f9935c32a604cdc4facf71fcd52aa48f0c3bef1b1",
  ],
  "17:A Middle Eastern": [
    "74cfd63a1811a75ed764d6e32b2e8a19600a95a98eb342c26470c044d703a89a",
    "7a2dcc4849a6fba37951007e53814d5edffaf69144e108e867798fdf0dd10beb",
    "4801b87e124c186293684d5ea7cda7a29977b25044ec2420c3609d77311e509f",
  ],
  "17:B Middle Eastern": [
    "e28bae130184c15a191a1e7f5f00bf8b618aaf1ea6f9de0b3a7f480bc5870fbb",
    "debb5af33767012fecc4f41eed5ead2aa00970c03e1e3c3c014a9150a14d377d",
    "df0999b3efcd7fbed82c944538b7c107eb680a3e46eca002c0bbe9335adca205",
  ],
  "18:A Modern Pop (Ballad)": [
    "94a82ddbdc46fbd849a83bce8808d83da9eed42f14d3dd79b4603cc6c5d963b2",
    "9549754b781fb6fc49f369c7de22d512febbc49ce118cffa07c3d96852566aaa",
    "6231645bdec1c1f8f07f3cc445825a36cffe10f68e29251c98a8890db0e24736",
  ],
  "18:B Modern Pop (Ballad)": [
    "230cc25494a95f93775e23270a687611f8bce952c46a6f26e5289b9e44164904",
    "639c3c90450ba183579ddc53c46e5450f1b4ce66f50d00a427a759164c4a2530",
    "ae69ee83e2383120a9cb7592dc1b8d32e3e3072350059d09348cad366d8185c4",
  ],
  "19:A Disco Funk": [
    "0628bafec7f8e52576648fff0a2b602315fc7de5b341ae2f47e31c84efcaf8ed",
    "cd877bec7796c920cf130ba7a439160b110e4c8c98263e2cacba5f56ce8bc32c",
    "df883810c27e1280bc54f005bdbc59adf14703fbdaf2ad0cf2775ded39ad30cb",
  ],
  "19:B Disco Funk": [
    "cd691ead16b516120f11512091571228960b69f8b46f9bdfb54cdca5056824e0",
    "7e99b4f41d77e03cbbb319ac497b1eca734f9438e870b7d7c402b5d86677a0db",
    "8e519d53932683ef90912134498b50a1c599ef29be91eae21de5942cd068ee0b",
  ],
  "20:A Classic Rock": [
    "94a82ddbdc46fbd849a83bce8808d83da9eed42f14d3dd79b4603cc6c5d963b2",
    "acf59413c96a837398ad7b24d51ab201c944871f287da82bdc96d325f6fff5cc",
    "e76ed57671ce8c62de05abd33c4d53566043c26e7c81de1f28bee2ef1c32d6d6",
  ],
  "20:B Classic Rock": [
    "9a50aac170f98699e0552a9bd4b397e073804463d3cf63c0ef808e15144bdbcc",
    "73d101ddea6d9490a57a4296112f8f06a47746e411cd0050ba780e3d2b4f277c",
    "afe279d8362a3357eda2fca26748d481ff8ad03096b5b78896a5659bd88a1732",
  ],
  "21:A Bossa Nova": [
    "c3118247227ebf3d01e46eb96107f5475e3613cc07cfb636f3e3d622b510c501",
    "a7de41f8ac77b4b9401ffc72dd01873df64a3e00baf00190c11d3d9fafaf69c0",
    "a90decbe16d653c2e38d8c11b15fe800497d750b4eb9632d3b0aa0e2b96312b6",
  ],
  "21:B Bossa Nova": [
    "33397e10af3ac754d368986dbed3498fecc71a950f56179d4f69f7f3e41a7d34",
    "92c3843e8d0065416b39010cc45dc6f358b48a17d3aea817041a9584baffa523",
    "c4d6cb1485f1a2330c7129797c41d193a499e7717c416a1b150df3a9f5cc477f",
  ],
  "22:A Jazz Standard (Swing)": [
    "85eb5f688dda4eabdaf46562b7dd96be4e7ce3ef7d2dc3b9e549b7f54766a582",
    "63ee944c2eab5272ce13edb5798663ca901a0b36c6ba63299da8eb2e48e44b19",
    "b4bade77577f186c8a6a348b2c571bf90adaf9b4bbba9fbb66e923e642da1103",
  ],
  "22:B Jazz Standard (Swing)": [
    "61ab79939a5acd86f6eca96c47397e98cb3c7b8ae50a455e4076dd7d626c4f40",
    "9706ce0d7c4800fb177e6b98e6f58f4d2ae1d5b62ee20e1506f3967d9679aa8a",
    "5f9f3339600d888706f590609e26df2be1c1a46114ac0b89f88299bbb1c0aee9",
  ],
  "23:A Liquid Drum & Bass": [
    "f5f4a6e1fa73f56594dfe44d4db729f1aff1a36f5ae1c10f7436eca1f0c1370a",
    "14c109bce2c6904277349e7716d4ea27e13d70c4c5e525f6176d0dc0ed745588",
    "f83846894e7b0126cf8db49cb7aa3fe8599f1be87bdc991fb2abdae3f465386e",
  ],
  "23:B Liquid Drum & Bass": [
    "e9468d003cfb09d416027e79a94e1b28cfd075ec819aa303df675c8f35376fa4",
    "20b72826de41f95c1eca5c56d017d3b1915ccafbb313a53f4d1df4d983f0694d",
    "b5594534250ab0df110c377f0db5994f1a4eee9d09f6aa35ab9c415f488311fa",
  ],
  "24:A Jungle / Breakbeat": [
    "76cdb733711a9e086ac083e0841e744411899552dcf90f2ee956fe7181ee99a9",
    "281d12b86802ed0ed30bb0699d099b216d0d347af076ab5d7714c87e547fa163",
    "9bf3a4b57cce5163424c1a7a86bde4e0182ff484d20f99a059dc37426637fa62",
  ],
  "24:B Jungle / Breakbeat": [
    "63e0433d60216162c7c540b943a3843c78115efcad808be7b810286586fee05e",
    "9afd14c12c7603ac571dc8ddb8ad4fcaca31bd1b1e67d88bc08999713196239b",
    "c163dc58653341cf3e142d10cabb9683d8829625e5253e2389437294fd43d097",
  ],
  "25:A Afrobeat": [
    "c1bdcbc334ddfdb5d143b0407b6a8f67f57d052d4836114d38aa00f0985add04",
    "5887b9a1d5addbfa681df69983f67d557cad0c16823aea7dc726d9cc2eefdced",
    "8e9096068b4739aa20d8c59d11293030dca9d6d032a688266dbb3da41cc274fc",
  ],
  "25:B Afrobeat": [
    "60d988aa62b049b193f7a321d3369d966e109e81c4a40b13c18c74cbcfcc36ac",
    "b8fe7076bab1880daa2dcd2027e500149899c364894524bf77d9a063313afe44",
    "2adaa81d54b2a0f34994b3547bf52c7823020950f76c6f96a3b8d4c91ec2a93b",
  ],
  "26:A R&B / Neo-Soul": [
    "548804acbf0e9431d775884581bcb56e9c425876f4eb5a78ba381b59a3b916e2",
    "b61aec46489e82f2c820982c7380c75afc0d4e26ae01c342e973daa8fd0eea52",
    "fd7d1ab3478713eb572c92f06939950f328fbcab341aa039c211455596640f0c",
  ],
  "26:B R&B / Neo-Soul": [
    "09080f4f47630518e77862e8dac2eafd172e0f548c1390929dad160163dececc",
    "1e513531a399810d6a020829fa791e20d73e3781927b529ab8b4cfa5e9fcef51",
    "88eb33b756072cea5fea611c1f3b5479140a7c2bd7602421a091c3ea7d0c26a0",
  ],
  "rhythm-absolute-0-6-10": [
    "94a82ddbdc46fbd849a83bce8808d83da9eed42f14d3dd79b4603cc6c5d963b2",
    "dcbbca340164bffa64fde29e2b27c1943e1cd9acc1e52d0f0d1cc005ead2ad33",
    "4e6ea3749ee4802f4ac2dbd0c89e560571a7ac60b27b299a4d527b0e76ef683d",
  ],
  "octave-plus-1": [
    "94a82ddbdc46fbd849a83bce8808d83da9eed42f14d3dd79b4603cc6c5d963b2",
    "672c2bf6e2d9c2cd57acee9fb25c466a637049339f19ca77fbbe73d9afe0305a",
    "4e6ea3749ee4802f4ac2dbd0c89e560571a7ac60b27b299a4d527b0e76ef683d",
  ],
  "progression-jazz_251_maj": [
    "94a82ddbdc46fbd849a83bce8808d83da9eed42f14d3dd79b4603cc6c5d963b2",
    "0a80874dab7e6739788b9295ff27cfc8cc1c373528bab7eb204db3fb59c45e0a",
    "ef62f1ad090353d5c1d7119e307d9ee0c801d5fe72a9c78cedf44e3551627bc7",
  ],
  "non-bass-melodic-track": [
    "94a82ddbdc46fbd849a83bce8808d83da9eed42f14d3dd79b4603cc6c5d963b2",
    "9549754b781fb6fc49f369c7de22d512febbc49ce118cffa07c3d96852566aaa",
    "4e6ea3749ee4802f4ac2dbd0c89e560571a7ac60b27b299a4d527b0e76ef683d",
  ],
};

describe("MIDI export golden — T1 changes no exported byte", () => {
  it("covers every style in both themes, plus the particular cases", () => {
    expect(BRICKS).toHaveLength(27);
    expect(allCases()).toHaveLength(27 * 2 + Object.keys(SPECIAL_CASES).length);
    expect(Object.keys(GOLDEN).sort()).toEqual(allCases().map(([name]) => name).sort());
  });

  // Positive control: a fingerprint of an empty file would also be "stable".
  it("fingerprints files that actually hold notes (default style)", () => {
    const state = studioState(0, "A");
    const count = (bytes) => new Midi(bytes).tracks.reduce((n, t) => n + t.notes.length, 0);
    expect(count(exportDrums(state.drums, GOLDEN_BPM, "Genre"))).toBeGreaterThan(0);
    expect(
      count(exportChords(state.brick, state.progression, state.rhythm, state.octaveOffset, GOLDEN_BPM, "Genre")),
    ).toBeGreaterThan(0);
    expect(count(exportBass(state.melody, state.brick, state.progression, GOLDEN_BPM))).toBeGreaterThan(0);
  });

  it.each(allCases())("%s", (name, build) => {
    const { drums, chords, bass } = fingerprints(build());
    expect([drums, chords, bass]).toEqual(GOLDEN[name]);
  });
});

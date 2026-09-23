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
    "c0f7871ce53c4840ae22d6025ec4ea197aa9d487cc6ac4269453448d07720e58",
    "a30342c6917c13eb345f602f0a9c7041195f1f0a179e5720360afe8c45e21aa6",
  ],
  "6:B Nostalgic Psytrance": [
    "034b6b75f9d595439327d0d152e398213f00acffae339f7ff3ae44370141ae84",
    "02b7b965132c2c041ea56caaf681789ce1cba8f9aff229f3d1bfcb0bc4e3d7ef",
    "483c6079d73890dd317c53a7a1a6bd4a9f0fe2d4be011eb3e9a53fc5fcc83f6e",
  ],
  "7:A Epic Metal": [
    "8ca8c83643dc1616671000ece822ef4b0881a1d6bbc906b0ec83d60c6a591583",
    "1c427af06f9b5d64dfd9c4df2a067b2b9c3666079cd9b0a85a6b5fbed562f2ab",
    "a6b49199d03bd8428f95f727ebc2d6a8d11ad05f09eb765fbe27384a2a1dd237",
  ],
  "7:B Epic Metal": [
    "420189ffc0f8b6d46332fd9d70ac46e0f89b68c11c1bc6281a2d717f95873221",
    "b812e9485c754ace67a9dbfbd48960181c7d03e4e1cb0084da4bf7e52824ac88",
    "5f2a8be250f3dcab89b86665f85044c7c6949c54f0b2fb845f831e55e7b5fa34",
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
    "06a2f5385b16dc8d12311c6d26b75bbfae85dfe6e68cfc87db891af6a2e5b6c1",
    "7501063545bd1ad14c24a57a2abe6ed9a6973e9c537b46ac8d6d1f81dfdb9dad",
  ],
  "11:A Modern Trap": [
    "be88fd641cfe8c373c55298a9a0641ca6fbb0891e76983581e7806999ed88fac",
    "6866d5c6d6c1f797ba7725b8681e2725903f46e46ef3e3e7cdc5c922a41ce9f3",
    "04f09a136c2ecce2fc9a904ecfc4517c087d41f028b735054279f8aa944e1221",
  ],
  "11:B Modern Trap": [
    "f9e64bcb670e0febd5a033974263e79b81460f6482117f4fec97b21e499b8d74",
    "06baa7cd5ced0193edc923fb03d465e450f17dfad6ed7e27634559ef67f6c2b1",
    "e14ddfdb87348503cf349dce028306e4ae7705994c88323221c5b3c65616c496",
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
    "d025a6708619862526d18f18d1b0d4f787759fb0ede79a6ca7c5abfd27bc24e4",
    "f7c3d85f3d248d6d54d479f1e1b09e0e273d2c7b534d0dbaa156c7ac1a983c9e",
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
    "775952cc435a26ff81430ffa579f9619c6bb0c6b7b80eddd30e6ab88e514bc56",
    "20dbb60b6e96f1c77112657cf055b783c32381242e4c31fb6c208cfb42997826",
  ],
  "15:B House": [
    "b7e13eb0cc1c25880c4d3826d2bd3fde779a1b0c76765f8beac217dfe67c5431",
    "6a6fe0619131565ae300eb37fc003c2e86b3dca3af6660903a0e4bc46e2bd0b6",
    "412966bf955dfe1e79eaf46cd33510d4d2b63a6bc13242bb5696bd851907caf7",
  ],
  "16:A Groove Metal": [
    "0aff36e25993b22387bd7a852f42594fdad3b1e78b8d4bdd38006b24d047648b",
    "91e78e035d3e7c559b338dcfc794c3869837ed4fc048f91c4d2aeaee6111065d",
    "1b2e9ccfe1cb88008ae3cfceb45ed33425e8cc5acb632f05701f4e0e3f63b5bb",
  ],
  "16:B Groove Metal": [
    "dd0ecb0b0d35c37921aa22ba0355f4d11db9792bb23ca4cda94b21fe88acdac7",
    "42cf0ffbf7495a0c6e47065dcc828dcea1e8c37cc84b8ecd5216c001c8e2069d",
    "23400531725d51f818947fde7ea30d5f245809e0980f3f050e9a453b2d3a5193",
  ],
  "17:A Middle Eastern": [
    "74cfd63a1811a75ed764d6e32b2e8a19600a95a98eb342c26470c044d703a89a",
    "c721fd52c9237d4ce87bf3415ee9dc0a2b23189763e08bb5c2d23899cd39e424",
    "7317d9f76431cf981611fa1e6eb39bd28cb1862caa00f16ead6bd52100344bf9",
  ],
  "17:B Middle Eastern": [
    "e28bae130184c15a191a1e7f5f00bf8b618aaf1ea6f9de0b3a7f480bc5870fbb",
    "e888c596cc8c4a4afa07c4acde2aec3dd944a554d9a0ff3d13bb789735568a90",
    "790bfbcee49cb178c12ba698a4e76082138d155b4527818ed6f71142ca360895",
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
    "b276d4cbf26c3a15320a9a4cca8df6844c09b45bc924a0326273f603ad38e65d",
    "b23e236340b76b86a139753cff6c3dbc85d5a17a8362c46fbfc4ece9564ae179",
  ],
  "20:A Classic Rock": [
    "94a82ddbdc46fbd849a83bce8808d83da9eed42f14d3dd79b4603cc6c5d963b2",
    "acf59413c96a837398ad7b24d51ab201c944871f287da82bdc96d325f6fff5cc",
    "e76ed57671ce8c62de05abd33c4d53566043c26e7c81de1f28bee2ef1c32d6d6",
  ],
  "20:B Classic Rock": [
    "9a50aac170f98699e0552a9bd4b397e073804463d3cf63c0ef808e15144bdbcc",
    "d025a6708619862526d18f18d1b0d4f787759fb0ede79a6ca7c5abfd27bc24e4",
    "f7c3d85f3d248d6d54d479f1e1b09e0e273d2c7b534d0dbaa156c7ac1a983c9e",
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
    "02b7b965132c2c041ea56caaf681789ce1cba8f9aff229f3d1bfcb0bc4e3d7ef",
    "2a585e8bbe3e7d28a170f7dbe3ed0b9930f9a3618b88a14e92ce04d9257c321b",
  ],
  "23:B Liquid Drum & Bass": [
    "e9468d003cfb09d416027e79a94e1b28cfd075ec819aa303df675c8f35376fa4",
    "1797cbc37e2152ae0d94fe4e2d793e41cd9ba5b6ecb374153d0ab45211637c0b",
    "793a2d7817b34f91c205d5626106bdcd182c9c544edfb26768037e3253522d52",
  ],
  "24:A Jungle / Breakbeat": [
    "76cdb733711a9e086ac083e0841e744411899552dcf90f2ee956fe7181ee99a9",
    "9da68110161e3fa66fb36811d9ab82ba3a70177347b32e2e5bfb3044843412bc",
    "9d970f374095a26b0c3af28ede34e78e5b28f72309c968b7dc69fa7dd3a79424",
  ],
  "24:B Jungle / Breakbeat": [
    "63e0433d60216162c7c540b943a3843c78115efcad808be7b810286586fee05e",
    "06faeaec6371a91c2d3ff63dff87860b22756f30bd86e51a7628a8619bbef20c",
    "42322a591cb99bb5b47d26dfd9978b0dab71613fbeab0d2198ed88b64db7a20a",
  ],
  "25:A Afrobeat": [
    "c1bdcbc334ddfdb5d143b0407b6a8f67f57d052d4836114d38aa00f0985add04",
    "5887b9a1d5addbfa681df69983f67d557cad0c16823aea7dc726d9cc2eefdced",
    "8e9096068b4739aa20d8c59d11293030dca9d6d032a688266dbb3da41cc274fc",
  ],
  "25:B Afrobeat": [
    "60d988aa62b049b193f7a321d3369d966e109e81c4a40b13c18c74cbcfcc36ac",
    "05d1bf94199ac71582afe7789c9b2479a0b434c164559a77e5b9065e6743d1a1",
    "c033e81d1de42d820cf48676149c0e1b82bdca95143e200d3d690bceb5c9a935",
  ],
  "26:A R&B / Neo-Soul": [
    "548804acbf0e9431d775884581bcb56e9c425876f4eb5a78ba381b59a3b916e2",
    "695140d4094e77c829d8ccf5e877a4fcd00615f57cd6c01e40f8348a29ddb64c",
    "280327bea80975c491fea9d64126ed964f0d6c8bdab6bba16206b61be6d0a937",
  ],
  "26:B R&B / Neo-Soul": [
    "09080f4f47630518e77862e8dac2eafd172e0f548c1390929dad160163dececc",
    "774b3f4e6e8054125ab4c6f6bc3a78815f9e015bac4e339dc4f3d2ec56445fe5",
    "28eec999d07afeeff7b10c6356749429d05e991ec28a0625ae2b216337c2a505",
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
    "b051ca65abb9a7ad865e637d82e2831ae84ec166e97d44ae633bcd85d1d45a0b",
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

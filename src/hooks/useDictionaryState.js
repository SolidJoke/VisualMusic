import { useState } from "react";

export function useDictionaryState() {
  const [dictRoot, setDictRoot] = useState(0);
  const [dictType, setDictType] = useState("single_note");
  const [fretboardZone, setFretboardZone] = useState("all");
  const [selectedRootString, setSelectedRootString] = useState(null);

  return {
    dictRoot, setDictRoot,
    dictType, setDictType,
    fretboardZone, setFretboardZone,
    selectedRootString, setSelectedRootString
  };
}

import { useState } from "react";

export function useDictionaryState() {
  const [dictRoot, setDictRoot] = useState(0);
  const [dictType, setDictType] = useState("single_note");
  const [fretboardZone, setFretboardZone] = useState("all");
  const [selectedRootStringGuitar, setSelectedRootStringGuitar] = useState(null);
  const [selectedRootStringBass, setSelectedRootStringBass] = useState(null);

  return {
    dictRoot, setDictRoot,
    dictType, setDictType,
    fretboardZone, setFretboardZone,
    selectedRootStringGuitar, setSelectedRootStringGuitar,
    selectedRootStringBass, setSelectedRootStringBass
  };
}

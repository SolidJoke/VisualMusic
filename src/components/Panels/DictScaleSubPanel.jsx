import React from "react";
import { useAppContext } from "../../context/AppContext";
import CustomSelect from "../Common/CustomSelect";
import { SCALES } from "../../core/theory";

export default function DictScaleSubPanel({
  dictType,
  setDictType,
  groupedScales,
  uiTheme,
  SCALE_LABEL_MAP
}) {
  const { lang, txt } = useAppContext();
  
  const currentItem = SCALES[dictType] || null;
  const emotionText = currentItem ? currentItem.emotion[lang] || currentItem.emotion.en : null;
  const descriptionText = currentItem ? currentItem.description[lang] || currentItem.description.en : null;

  return (
    <div className="select-group">
      <CustomSelect
        value={dictType}
        onChange={(val) => setDictType(val)}
        options={groupedScales.map((group) => ({
          label: txt[group.labelKey] || group.category,
          items: group.items.map((scaleKey) => ({
            value: scaleKey,
            label: txt[SCALE_LABEL_MAP[scaleKey]] || scaleKey
          }))
        }))}
        theme={uiTheme === 'vintage' ? 'vintage' : 'modern'}
      />

      {emotionText && (
        <div className="dict-panel__emotion-card">
          <div className="dict-panel__emotion-title">🎭 {emotionText}</div>
          {descriptionText && <div className="dict-panel__emotion-desc">{descriptionText}</div>}
        </div>
      )}
    </div>
  );
}

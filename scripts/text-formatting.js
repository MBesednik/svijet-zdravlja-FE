(function () {
  "use strict";

  // Unicode math bold/italic offsets
  const BOLD_UPPER = 0x1d400 - 0x41; // A
  const BOLD_LOWER = 0x1d41a - 0x61; // a
  const BOLD_DIGIT = 0x1d7ce - 0x30; // 0-9
  const ITALIC_UPPER = 0x1d434 - 0x41;
  const ITALIC_LOWER = 0x1d44e - 0x61;
  const COMBINING_STROKE = "\u0335";
  const STROKED_D_LOWER = "\u0111";
  const STROKED_D_UPPER = "\u0110";

  const segmenter =
    typeof Intl !== "undefined" && Intl.Segmenter
      ? new Intl.Segmenter("hr", { granularity: "grapheme" })
      : null;

  function getGraphemes(text) {
    if (!text) return [];
    if (segmenter) return Array.from(segmenter.segment(text), (s) => s.segment);
    return Array.from(text);
  }

  function isCombiningMark(code) {
    return (
      (code >= 0x0300 && code <= 0x036f) ||
      (code >= 0x1ab0 && code <= 0x1aff) ||
      (code >= 0x1dc0 && code <= 0x1dff) ||
      (code >= 0x20d0 && code <= 0x20ff) ||
      (code >= 0xfe20 && code <= 0xfe2f)
    );
  }

  function convertBaseToStyled(baseCode, style) {
    if (style === "bold") {
      if (baseCode >= 0x41 && baseCode <= 0x5a) return baseCode + BOLD_UPPER;
      if (baseCode >= 0x61 && baseCode <= 0x7a) return baseCode + BOLD_LOWER;
      if (baseCode >= 0x30 && baseCode <= 0x39) return baseCode + BOLD_DIGIT;
    } else if (style === "italic") {
      if (baseCode >= 0x41 && baseCode <= 0x5a) return baseCode + ITALIC_UPPER;
      if (baseCode >= 0x61 && baseCode <= 0x7a) return baseCode + ITALIC_LOWER;
    }
    return null;
  }

  function normalizeFromStyled(text, style) {
    if (!text) return "";
    let out = "";
    const cps = Array.from(text);
    for (let i = 0; i < cps.length; i++) {
      const ch = cps[i];
      const code = ch.codePointAt(0);
      if (style === "bold") {
        if (code >= 0x1d400 && code <= 0x1d419) {
          out += String.fromCodePoint(code - BOLD_UPPER);
          while (i + 1 < cps.length && isCombiningMark(cps[i + 1].codePointAt(0))) {
            out += cps[++i];
          }
          continue;
        }
        if (code >= 0x1d41a && code <= 0x1d433) {
          out += String.fromCodePoint(code - BOLD_LOWER);
          while (i + 1 < cps.length && isCombiningMark(cps[i + 1].codePointAt(0))) {
            out += cps[++i];
          }
          continue;
        }
        if (code >= 0x1d7ce && code <= 0x1d7d7) {
          out += String.fromCodePoint(code - BOLD_DIGIT);
          while (i + 1 < cps.length && isCombiningMark(cps[i + 1].codePointAt(0))) {
            out += cps[++i];
          }
          continue;
        }
      } else if (style === "italic") {
        if (code >= 0x1d434 && code <= 0x1d44d) {
          out += String.fromCodePoint(code - ITALIC_UPPER);
          while (i + 1 < cps.length && isCombiningMark(cps[i + 1].codePointAt(0))) {
            out += cps[++i];
          }
          continue;
        }
        if (code >= 0x1d44e && code <= 0x1d467) {
          out += String.fromCodePoint(code - ITALIC_LOWER);
          while (i + 1 < cps.length && isCombiningMark(cps[i + 1].codePointAt(0))) {
            out += cps[++i];
          }
          continue;
        }
      }
      out += ch;
    }
    out = out.replace(new RegExp("d" + COMBINING_STROKE, "g"), STROKED_D_LOWER);
    out = out.replace(new RegExp("D" + COMBINING_STROKE, "g"), STROKED_D_UPPER);
    return out.normalize("NFC");
  }

  function stripAllStyles(text) {
    if (!text) return "";
    let stripped = text;
    stripped = normalizeFromStyled(stripped, "bold");
    stripped = normalizeFromStyled(stripped, "italic");
    return stripped;
  }

  function isStyled(text, style) {
    if (!text) return false;
    for (let i = 0; i < text.length; i++) {
      const code = text.codePointAt(i);
      if (style === "bold") {
        if (
          (code >= 0x1d400 && code <= 0x1d433) ||
          (code >= 0x1d7ce && code <= 0x1d7d7)
        ) {
          return true;
        }
      } else if (style === "italic") {
        if (code >= 0x1d434 && code <= 0x1d467) {
          return true;
        }
      }
      if (code > 0xffff) i++;
    }
    return false;
  }

  function toUnicodeStyled(text, style) {
    if (!text) return "";
    let out = "";
    const cps = getGraphemes(text);
    for (let i = 0; i < cps.length; i++) {
      const ch = cps[i];
      let decomposed = ch.normalize("NFD");
      let base = decomposed[0];
      let combining = decomposed.slice(1);
      if (base === STROKED_D_LOWER) {
        base = "d";
        combining = COMBINING_STROKE + combining;
      } else if (base === STROKED_D_UPPER) {
        base = "D";
        combining = COMBINING_STROKE + combining;
      }
      const baseCode = base.codePointAt(0);
      const styledCode = convertBaseToStyled(baseCode, style);
      if (styledCode) {
        out += String.fromCodePoint(styledCode) + combining;
      } else {
        out += ch;
      }
    }
    return out.normalize("NFC");
  }

  function applyStyleToSelection(textarea, style, onNoSelection) {
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start == null || end == null || start === end) {
      if (typeof onNoSelection === "function") onNoSelection();
      textarea.focus();
      return;
    }
    const value = textarea.value || "";
    const selected = value.slice(start, end);
    const baseSelected = stripAllStyles(selected);
    const alreadyThisStyle = isStyled(selected, style);
    const styled = toUnicodeStyled(baseSelected, style);
    const replacement = alreadyThisStyle ? baseSelected : styled;
    const nextValue = value.slice(0, start) + replacement + value.slice(end);
    textarea.value = nextValue;
    const selStart = start;
    const selEnd = start + replacement.length;
    textarea.focus();
    textarea.setSelectionRange(selStart, selEnd);
  }

  window.svzTextFormatting = {
    toUnicodeStyled,
    applyStyleToSelection,
  };
})();

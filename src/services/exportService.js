import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";

function getOptions(q) {
  if (!q.options) return [];
  if (Array.isArray(q.options)) return q.options.map(o => String(o));
  if (typeof q.options === "object") return Object.values(q.options).map(o => String(o));
  try { return JSON.parse(q.options).map(o => String(o)); } catch { return []; }
}

function buildQuestionParagraphs(q, idx, submission) {
  const paragraphs = [];
  const studentAnswer = submission.answers?.[q.id];
  const isAutoGraded = ["multiple_choice", "true_false", "fill_blank"].includes(q.type);

  paragraphs.push(new Paragraph({
    spacing: { before: 300, after: 100 },
    children: [
      new TextRun({ text: `${idx + 1}. `, bold: true }),
      new TextRun({ text: q.question, bold: true }),
    ],
  }));

  if (q.type === "multiple_choice") {
    getOptions(q).forEach((opt, i) => {
      const isStudentChoice = String(studentAnswer) === String(i);
      const isCorrectChoice = String(q.correct_answer) === String(i);
      let suffix = "";
      if (isCorrectChoice) suffix = "  ✓ Correct answer";
      if (isStudentChoice && !isCorrectChoice) suffix = "  ✗ Student's answer";
      paragraphs.push(new Paragraph({
        indent: { left: 400 },
        children: [
          new TextRun({ text: `${String.fromCharCode(65 + i)}. ${opt}`, bold: isStudentChoice || isCorrectChoice }),
          new TextRun({ text: suffix, italics: true }),
        ],
      }));
    });
  } else if (q.type === "true_false") {
    ["True", "False"].forEach((val, i) => {
      const isStudentChoice = String(studentAnswer) === val || String(studentAnswer) === String(i);
      const isCorrectChoice = String(q.correct_answer) === val || String(q.correct_answer) === String(i);
      let suffix = "";
      if (isCorrectChoice) suffix = "  ✓ Correct answer";
      if (isStudentChoice && !isCorrectChoice) suffix = "  ✗ Student's answer";
      paragraphs.push(new Paragraph({
        indent: { left: 400 },
        children: [
          new TextRun({ text: val, bold: isStudentChoice || isCorrectChoice }),
          new TextRun({ text: suffix, italics: true }),
        ],
      }));
    });
  } else {
    paragraphs.push(new Paragraph({
      indent: { left: 400 },
      children: [
        new TextRun({ text: "Student's Answer: ", bold: true }),
        new TextRun({ text: studentAnswer || "(No answer provided)" }),
      ],
    }));
    if (q.correct_answer) {
      paragraphs.push(new Paragraph({
        indent: { left: 400 },
        children: [
          new TextRun({ text: q.type === "essay" ? "Rubric/Instructions: " : "Correct/Expected Answer: ", bold: true }),
          new TextRun({ text: q.correct_answer }),
        ],
      }));
    }
    if (!isAutoGraded && submission.manual_scores?.[q.id] !== undefined && submission.manual_scores?.[q.id] !== "") {
      paragraphs.push(new Paragraph({
        indent: { left: 400 },
        children: [new TextRun({ text: `Score Given: ${submission.manual_scores[q.id]} / ${q.points || 1}`, bold: true })],
      }));
    }
  }
  return paragraphs;
}

function buildStudentSection(assessment, questions, submission) {
  const children = [];
  children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: assessment.title })] }));
  children.push(new Paragraph({
    spacing: { after: 200 },
    children: [
      new TextRun({ text: `Student: ${submission.studentName}`, bold: true }),
      new TextRun({
        text: submission.score != null
          ? `    Score: ${submission.score}/${submission.max_score} (${Math.round((submission.score / (submission.max_score || 1)) * 100)}%)`
          : "    Not yet graded",
        bold: true,
      }),
    ],
  }));
  questions.forEach((q, idx) => buildQuestionParagraphs(q, idx, submission).forEach(p => children.push(p)));
  return children;
}

// ── Export ONE student's assessment ──
export async function exportSingleStudentDocx(assessment, questions, submission) {
  const doc = new Document({ sections: [{ children: buildStudentSection(assessment, questions, submission) }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${assessment.title}_${submission.studentName}.docx`.replace(/\s+/g, "_"));
}

// ── Export ALL students' assessments (one file, page per student) ──
export async function exportAllStudentsDocx(assessment, questions, submissions) {
  const sections = submissions.map(sub => ({ children: buildStudentSection(assessment, questions, sub) }));
  const doc = new Document({ sections });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${assessment.title}_AllStudents.docx`.replace(/\s+/g, "_"));
}
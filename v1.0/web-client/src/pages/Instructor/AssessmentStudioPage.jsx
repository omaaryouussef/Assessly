import React from 'react'
import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faFilePen, faPen, faTrash } from '@fortawesome/free-solid-svg-icons'

function AssessmentStudioPage() {
  // Assessment specifications
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(0)
  const [type, setType] = useState('')
  const [maxGrade, setMaxGrade] = useState(0)
  const [dueDate, setDueDate] = useState('')

  //Security Specifications
  const [windowSwitching, setWindowSwitching] = useState(false)
  const [clipboardAccess, setClipboardAccess] = useState(false)
  const [screenSnapshot, setScreenSnapshot] = useState(false)
  const [questionStats, setQuestionStats] = useState(false)

  //Questions specifications
  const [showQForm, setShowQForm] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState(null)
  const [qType, setQType] = useState('')
  const [qPrompt, setQPrompt] = useState('')
  const [options, setOptions] = useState([])
  const [qMaxGrade, setQMaxGrade] = useState(0)
  const [progLang, setprogLang] = useState('')
  const [questionsList, setQuestionsList] = useState([])

  const [errMessage, setErrMessage] = useState('')

  const handleSaveQuestion = () => {
    if (!qType || !qPrompt || !qMaxGrade) {
      setErrMessage('All fields are required')
      return
    } else if (qType === 'MCQ' && options.length === 0) {
      setErrMessage('At least one option is required for MCQ')
      return
    } else if (qType === 'CODING' && !progLang) {
      setErrMessage('Programming language is required for coding')
      return
    }

    setErrMessage('')
    const questionData = {
      qType,
      qPrompt,
      qMaxGrade,
      progLang,
      options: [...options],
    }

    if (editingQuestionId) {
      setQuestionsList(
        questionsList.map((q) =>
          q.id === editingQuestionId ? { ...q, ...questionData } : q,
        ),
      )
    } else {
      setQuestionsList([...questionsList, { id: Date.now(), ...questionData }])
    }

    resetQForm()
  }

  const handleEditQuestion = (question) => {
    setEditingQuestionId(question.id)
    setQType(question.qType)
    setQPrompt(question.qPrompt)
    setQMaxGrade(question.qMaxGrade)
    setprogLang(question.progLang || '')
    setOptions([...question.options])
    setShowQForm(true)
    setErrMessage('')
  }

  const handleDeleteQuestion = (questionId) => {
    setQuestionsList(questionsList.filter((q) => q.id !== questionId))
    if (editingQuestionId === questionId) {
      resetQForm()
    }
  }

  const resetQForm = () => {
    setShowQForm(false)
    setEditingQuestionId(null)
    setQType('')
    setQPrompt('')
    setQMaxGrade(0)
    setprogLang('')
    setOptions([])
  }

  const openNewQuestionForm = () => {
    setEditingQuestionId(null)
    setQType('')
    setQPrompt('')
    setQMaxGrade(0)
    setprogLang('')
    setOptions([])
    setErrMessage('')
    setShowQForm(true)
  }

  return (
    <div className="assessment-studio-page">
      <div className="course-special-header">
        <FontAwesomeIcon icon={faFilePen} />
        <span> / </span>
        <p>Assessment Studio</p>
      </div>

      <form className="assessment-studio-form">
        <div className="assessment-specifications-form">
          <div className="form-header-text">
            <h3>1. Assessment details</h3>
          </div>
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="type">Type</label>
            <select
              id="type"
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="ASSIGNMENT">Assignment</option>
              <option value="EXAM">Exam</option>
              <option value="QUIZ">Quiz</option>
            </select>
          </div>
          {(type === 'EXAM' || type === 'QUIZ') && (
            <div className="form-group">
              <label htmlFor="duration">Duration</label>
              <input
                type="number"
                id="duration"
                name="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="max-grade">Max Grade</label>
            <input
              type="number"
              id="max-grade"
              name="max-grade"
              value={maxGrade}
              onChange={(e) => setMaxGrade(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="due-date">Due Date</label>
            <input
              type="date"
              id="due-date"
              name="due-date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <div className="security-specifications-form">
          <div className="form-header-text">
            <h3>2. Security settings</h3>
          </div>
          <div className="form-group">
            <label htmlFor="window-switching">Window Switching</label>
            <input
              type="checkbox"
              id="window-switching"
              name="window-switching"
              value={windowSwitching}
              onChange={(e) => setWindowSwitching(e.target.checked)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="clipboard-access">Clipboard Access</label>
            <input
              type="checkbox"
              id="clipboard-access"
              name="clipboard-access"
              value={clipboardAccess}
              onChange={(e) => setClipboardAccess(e.target.checked)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="screen-snapshot">Screen Snapshot</label>
            <input
              type="checkbox"
              id="screen-snapshot"
              name="screen-snapshot"
              value={screenSnapshot}
              onChange={(e) => setScreenSnapshot(e.target.checked)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="question-stats">Question Stats</label>
            <input
              type="checkbox"
              id="question-stats"
              name="question-stats"
              value={questionStats}
              onChange={(e) => setQuestionStats(e.target.checked)}
            />
          </div>
        </div>

        <div className="question-specifications-form">
          <div className="form-header-text question-builder-header">
            <h3>3. Question Builder</h3>
            {!showQForm && (
              <button
                type="button"
                className="add-question-btn"
                onClick={openNewQuestionForm}
              >
                <FontAwesomeIcon icon={faPlus} />
                Add Question
              </button>
            )}
          </div>

          {questionsList.length > 0 ? (
            <div className="question-list">
              {questionsList.map((question, index) => (
                <div
                  key={question.id}
                  className={`question-row question-row--${question.qType.toLowerCase()}`}
                >
                  <div className="question-row-header">
                    <span className="question-row-label">Q{index + 1}</span>
                    <span className="question-row-type">{question.qType}</span>
                    <div className="question-row-actions">
                      <button
                        type="button"
                        className="assignment-row-action-btn assignment-row-action-btn--edit"
                        onClick={() => handleEditQuestion(question)}
                        aria-label={`Edit question ${index + 1}`}
                      >
                        <FontAwesomeIcon icon={faPen} />
                      </button>
                      <button
                        type="button"
                        className="assignment-row-action-btn assignment-row-action-btn--delete"
                        onClick={() => handleDeleteQuestion(question.id)}
                        aria-label={`Delete question ${index + 1}`}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>
                  <div className="question-row-body">
                    <strong>Prompt:</strong>
                    <p>{question.qPrompt}</p>
                    <strong>Points:</strong>
                    <p>{question.qMaxGrade}</p>
                    {question.progLang && (
                      <>
                        <strong>Programming Language:</strong>
                        <p>{question.progLang}</p>
                      </>
                    )}
                    {question.options.length > 0 && (
                      <>
                        <strong>Options:</strong>
                        <ul>
                          {question.options.map((option, optionIndex) => (
                            <li key={optionIndex}>{option}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !showQForm && (
              <p className="question-list-empty">No questions added yet.</p>
            )
          )}

          {errMessage && <p className="error-message">{errMessage}</p>}

          {showQForm && (
            <div
              className={`question-editor${editingQuestionId ? ' question-editor--edit' : ' question-editor--new'}`}
            >
              <div className="form-group">
                <label htmlFor="question-type">Question Type</label>
                <select
                  id="question-type"
                  name="question-type"
                  value={qType}
                  onChange={(e) => setQType(e.target.value)}
                >
                  <option value="ESSAY">Essay</option>
                  <option value="CODING">Coding</option>
                  <option value="MCQ">MCQ</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="question-prompt">Prompt</label>
                <input
                  type="text"
                  id="question-prompt"
                  name="question-prompt"
                  value={qPrompt}
                  onChange={(e) => setQPrompt(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="question-max-grade">Points</label>
                <input
                  type="number"
                  id="question-max-grade"
                  name="question-max-grade"
                  value={qMaxGrade}
                  onChange={(e) => setQMaxGrade(e.target.value)}
                />
              </div>
              {qType === 'CODING' && (
                <div className="form-group">
                  <label htmlFor="question-prog-lang">Programming Language</label>
                  <input
                    type="text"
                    id="question-prog-lang"
                    name="question-prog-lang"
                    value={progLang}
                    onChange={(e) => setprogLang(e.target.value)}
                  />
                </div>
              )}
              <div className="question-editor-actions">
                <button
                  type="button"
                  className="save-question-btn"
                  onClick={handleSaveQuestion}
                >
                  {editingQuestionId ? 'Update' : 'Save'}
                </button>
                <button
                  type="button"
                  className="cancel-question-btn"
                  onClick={resetQForm}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}

export default AssessmentStudioPage

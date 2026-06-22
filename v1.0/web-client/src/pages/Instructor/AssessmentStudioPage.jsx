import React from 'react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlus,
  faFilePen,
  faPen,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'

function AssessmentStudioPage() {
  const navigate = useNavigate()
  const { courseId } = useParams()
  // Assessment specifications
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(0)
  const [type, setType] = useState('')
  const [maxGrade, setMaxGrade] = useState(0)
  const [dueDate, setDueDate] = useState('')
  const [assessmentErr, setAssessmentErr] = useState('')

  //Security Specifications
  const [windowSwitching, setWindowSwitching] = useState(false)
  const [clipboardAccess, setClipboardAccess] = useState(false)
  const [screenSnapshot, setScreenSnapshot] = useState(false)
  const [questionStats, setQuestionStats] = useState(false)

  //Questions specifications
  const [activeQuestionForm, setActiveQuestionForm] = useState(null)
  const [qType, setQType] = useState('')
  const [qPrompt, setQPrompt] = useState('')
  const [options, setOptions] = useState([])
  const [qMaxGrade, setQMaxGrade] = useState(0)
  const [progLang, setprogLang] = useState('')
  const [questionsList, setQuestionsList] = useState([])

  const [questionErr, setQuestionErr] = useState('')
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    duration: 0,
    maxGrade: 0,
    dueDate: '',
    securitySettings: {
      windowSwitching: false,
      clipboardAccess: false,
      screenSnapshot: false,
      questionStats: false,
    },
    questions: [],
  })

  const handleSaveQuestion = () => {
    if (!qType || !qPrompt || !qMaxGrade) {
      setQuestionErr('All fields are required')
      return
    } else if (qType === 'MCQ' && options.length === 0) {
      setQuestionErr('At least one option is required for MCQ')
      return
    } else if (qType === 'CODING' && !progLang) {
      setQuestionErr('Programming language is required for coding')
      return
    }

    setQuestionErr('')
    const questionData = {
      qType,
      qPrompt,
      qMaxGrade,
      progLang,
      options: [...options],
    }

    if (activeQuestionForm && activeQuestionForm !== 'new') {
      setQuestionsList(
        questionsList.map((q) =>
          q.id === activeQuestionForm ? { ...q, ...questionData } : q
        )
      )
    } else {
      setQuestionsList([...questionsList, { id: Date.now(), ...questionData }])
    }

    resetQForm()
  }

  const handleEditQuestion = (question) => {
    setActiveQuestionForm(question.id)
    setQType(question.qType)
    setQPrompt(question.qPrompt)
    setQMaxGrade(question.qMaxGrade)
    setprogLang(question.progLang || '')
    setOptions([...question.options])
    setQuestionErr('')
  }

  const handleDeleteQuestion = (questionId) => {
    setQuestionsList(questionsList.filter((q) => q.id !== questionId))
    if (activeQuestionForm === questionId) {
      resetQForm()
    }
  }

  const resetQForm = () => {
    setActiveQuestionForm(null)
    setQType('')
    setQPrompt('')
    setQMaxGrade(0)
    setprogLang('')
    setOptions([])
    setQuestionErr('')
  }

  const openNewQuestionForm = () => {
    setActiveQuestionForm('new')
    setQType('')
    setQPrompt('')
    setQMaxGrade(0)
    setprogLang('')
    setOptions([])
    setQuestionErr('')
  }

  const renderQuestionEditor = (idPrefix) => (
    <div
      className={`question-editor question-editor--inline${
        activeQuestionForm === 'new'
          ? ' question-editor--new'
          : ' question-editor--edit'
      }`}
    >
      <div className="form-group">
        <label htmlFor={`${idPrefix}-question-type`}>Question Type</label>
        <select
          id={`${idPrefix}-question-type`}
          name={`${idPrefix}-question-type`}
          value={qType}
          onChange={(e) => setQType(e.target.value)}
        >
          <option value="" disabled defaultValue>
            Select Question Type
          </option>
          <option value="ESSAY">Essay</option>
          <option value="CODING">Coding</option>
          <option value="MCQ">MCQ</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor={`${idPrefix}-question-prompt`}>Prompt</label>
        <input
          type="text"
          id={`${idPrefix}-question-prompt`}
          name={`${idPrefix}-question-prompt`}
          value={qPrompt}
          onChange={(e) => setQPrompt(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor={`${idPrefix}-question-max-grade`}>Points</label>
        <input
          type="number"
          id={`${idPrefix}-question-max-grade`}
          name={`${idPrefix}-question-max-grade`}
          value={qMaxGrade}
          onChange={(e) => setQMaxGrade(e.target.value)}
        />
      </div>
      {qType === 'CODING' && (
        <div className="form-group">
          <label htmlFor={`${idPrefix}-question-prog-lang`}>
            Programming Language
          </label>
          <input
            type="text"
            id={`${idPrefix}-question-prog-lang`}
            name={`${idPrefix}-question-prog-lang`}
            value={progLang}
            onChange={(e) => setprogLang(e.target.value)}
          />
        </div>
      )}
      {qType === 'MCQ' && (
        <>
          <button
            type="button"
            className="add-option-btn"
            onClick={() => {
              const newOption = `Option ${options.length + 1}`
              setOptions([...options, newOption])
            }}
          >
            <FontAwesomeIcon icon={faPlus} />
            Add Option
          </button>
          {options.length > 0 && (
            <div className="form-group">
              <label htmlFor={`${idPrefix}-question-options`}>Options</label>
              {options.map((option, index) => (
                <div key={index} className="form-group">
                  <input
                    type="text"
                    id={`${idPrefix}-question-options-${index}`}
                    name={`${idPrefix}-question-options-${index}`}
                    value={option}
                    onChange={(e) => {
                      const next = [...options]
                      next[index] = e.target.value
                      setOptions(next)
                    }}
                  />
                  <button
                    type="button"
                    className="delete-option-btn"
                    onClick={() => {
                      setOptions(options.filter((_, i) => i !== index))
                    }}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {questionErr && <p className="error-message">{questionErr}</p>}
      <div className="question-editor-actions">
        <button
          type="button"
          className="save-question-btn"
          onClick={handleSaveQuestion}
        >
          {activeQuestionForm === 'new' ? 'Save' : 'Update'}
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
  )

  const handleSaveAssessment = (e) => {
    e.preventDefault()
    setAssessmentErr('')
    if (!title || !type || !maxGrade || !dueDate) {
      setAssessmentErr('All Assessment details are required')
      return
    }

    if (type === 'EXAM' || type === 'QUIZ') {
      if (duration === 0) {
        setAssessmentErr('Duration is required for timed assessments')
        return
      }
    } else if (questionsList.length === 0) {
      setAssessmentErr('At least one question is required')
      return
    }

    setFormData({
      title,
      type,
      duration,
      maxGrade,
      dueDate,
      securitySettings: {
        windowSwitching,
        clipboardAccess,
        screenSnapshot,
        questionStats,
      },
      questions: questionsList,
    })
    console.log(formData)
    //navigate to the assignments page for now
    navigate(`/course/${courseId}/assignments`)
  }

  const handleDiscardAssessment = () => {
    setShowDiscardModal(false)
    setFormData({
      title: '',
      type: '',
      duration: 0,
      maxGrade: 0,
      dueDate: '',
      securitySettings: {
        windowSwitching: false,
        clipboardAccess: false,
        screenSnapshot: false,
        questionStats: false,
      },
      questions: [],
    })
    setQuestionsList([])
    setActiveQuestionForm(null)
    setQType('')
    setQPrompt('')
    setQMaxGrade(0)
    setprogLang('')
    setOptions([])
    setQuestionErr('')
    setWindowSwitching(false)
    setClipboardAccess(false)
    setScreenSnapshot(false)
    setQuestionStats(false)
    //navigate to the assignments page for now
    navigate(`/course/${courseId}/assignments`)
  }

  const isFormOpen = activeQuestionForm !== null
  const hasQuestions = questionsList.length > 0 || activeQuestionForm === 'new'

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
              <option value="" disabled defaultValue>
                Select Assessment Type
              </option>
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
            {!isFormOpen && (
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

          {hasQuestions ? (
            <div className="question-list">
              {questionsList.map((question, index) => {
                const isEditing = activeQuestionForm === question.id

                return (
                  <div
                    key={question.id}
                    className={`question-row question-row--${question.qType.toLowerCase()}${
                      isEditing ? ' question-row--editing' : ''
                    }`}
                  >
                    <div className="question-row-header">
                      <span className="question-row-label">Q{index + 1}</span>
                      <span className="question-row-type">
                        {isEditing ? 'Editing' : question.qType}
                      </span>
                      {!isEditing && (
                        <div className="question-row-actions">
                          <button
                            type="button"
                            className="assignment-row-action-btn assignment-row-action-btn--edit"
                            onClick={() => handleEditQuestion(question)}
                            aria-label={`Edit question ${index + 1}`}
                            disabled={isFormOpen}
                          >
                            <FontAwesomeIcon icon={faPen} />
                          </button>
                          <button
                            type="button"
                            className="assignment-row-action-btn assignment-row-action-btn--delete"
                            onClick={() => handleDeleteQuestion(question.id)}
                            aria-label={`Delete question ${index + 1}`}
                            disabled={isFormOpen}
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      )}
                    </div>
                    {isEditing ? (
                      renderQuestionEditor(`q-${question.id}`)
                    ) : (
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
                    )}
                  </div>
                )
              })}

              {activeQuestionForm === 'new' && (
                <div className="question-row question-row--editing question-row--new">
                  <div className="question-row-header">
                    <span className="question-row-label">
                      Q{questionsList.length + 1}
                    </span>
                    <span className="question-row-type">New question</span>
                  </div>
                  {renderQuestionEditor('new')}
                </div>
              )}
            </div>
          ) : (
            <p className="question-list-empty">No questions added yet.</p>
          )}
        </div>
        {assessmentErr && <p className="error-message">{assessmentErr}</p>}
        <button
          type="submit"
          className="submit-btn"
          onClick={handleSaveAssessment}
        >
          Save Assessment
        </button>
        <button
          type="button"
          className="cancel-btn"
          onClick={() => setShowDiscardModal(true)}
        >
          Cancel
        </button>
      </form>
      {showDiscardModal && (
        <div className="discard-modal-backdrop">
          <div className="discard-modal">
            <h3>Discard Assessment</h3>
            <p>Are you sure you want to discard this assessment?</p>
            <div className="discard-modal-actions">
              <button
                type="button"
                className="discard-btn"
                onClick={handleDiscardAssessment}
              >
                Discard
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowDiscardModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AssessmentStudioPage

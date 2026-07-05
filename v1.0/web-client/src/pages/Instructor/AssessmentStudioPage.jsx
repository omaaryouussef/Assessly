import React, { useState, useEffect, useRef, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlus,
  faFilePen,
  faPen,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../components/auth/AuthWrapper'
import {
  clearDraft,
  isDraftEmpty,
  loadDraft,
  saveDraft,
} from '../../utils/assessmentStudioDraft'
import {
  isDueDateTimeInPast,
  parseDueDateForInput,
  parseDueTimeForInput,
} from '../../utils/assessmentDue'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL

function AssessmentStudioPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const assessmentType = location.state?.assessmentType || ''
  const assessmentToEdit = location.state?.assessmentToEdit || null
  const { courseId } = useParams()
  const { token } = useAuth()

  // Draft management
  const draftSnapshotRef = useRef(null)
  const skipDraftPersistRef = useRef(false)
  const [draftResolved, setDraftResolved] = useState(false)
  const [showDraftModal, setShowDraftModal] = useState(false)
  const [pendingDraft, setPendingDraft] = useState(null)
  const [editingAssessment, setEditingAssessment] = useState(assessmentToEdit)
  // Assessment specifications
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(0)
  const [type, setType] = useState(assessmentType)
  const [maxGrade, setMaxGrade] = useState(0)
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
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
  const [langVersion, setLangVersion] = useState('')
  const [needCodeSnippet, setNeedCodeSnippet] = useState(false)
  const [codeSnippet, setCodeSnippet] = useState('')
  const [questionsList, setQuestionsList] = useState([])

  const [questionErr, setQuestionErr] = useState('')
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const resetFormState = () => {
    setTitle('')
    setDuration(0)
    setType('')
    setMaxGrade(0)
    setDueDate('')
    setDueTime('')
    setWindowSwitching(false)
    setClipboardAccess(false)
    setScreenSnapshot(false)
    setQuestionStats(false)
    setQuestionsList([])
    setActiveQuestionForm(null)
    setQType('')
    setQPrompt('')
    setQMaxGrade(0)
    setprogLang('')
    setNeedCodeSnippet(false)
    setLangVersion('')
    setOptions([])
    setQuestionErr('')
    setAssessmentErr('')
    setEditingAssessment(null)
  }

  const buildDraftSnapshot = useCallback(
    () => ({
      title,
      duration,
      type,
      maxGrade,
      dueDate,
      dueTime,
      windowSwitching,
      clipboardAccess,
      screenSnapshot,
      questionStats,
      needCodeSnippet,
      codeSnippet,
      questionsList,
      editingAssessmentId: editingAssessment?.assessment_id ?? null,
    }),
    [
      title,
      duration,
      type,
      maxGrade,
      dueDate,
      dueTime,
      windowSwitching,
      clipboardAccess,
      screenSnapshot,
      questionStats,
      needCodeSnippet,
      codeSnippet,
      questionsList,
      editingAssessment,
    ]
  )

  const applyDraft = useCallback((draft) => {
    setTitle(draft.title || '')
    setDuration(draft.duration ?? 0)
    setType(draft.type || '')
    setMaxGrade(draft.maxGrade ?? 0)
    setDueDate(draft.dueDate || '')
    setDueTime(draft.dueTime || '')
    setWindowSwitching(Boolean(draft.windowSwitching))
    setClipboardAccess(Boolean(draft.clipboardAccess))
    setScreenSnapshot(Boolean(draft.screenSnapshot))
    setQuestionStats(Boolean(draft.questionStats))
    setQuestionsList(draft.questionsList || [])
    setNeedCodeSnippet(draft.needCodeSnippet || false)
    setCodeSnippet(draft.codeSnippet || '')
    setEditingAssessment(
      draft.editingAssessmentId
        ? { assessment_id: draft.editingAssessmentId }
        : null
    )
    setActiveQuestionForm(null)
    setQType('')
    setQPrompt('')
    setQMaxGrade(0)
    setprogLang('')
    setNeedCodeSnippet(false)
    setLangVersion('')
    setOptions([])
    setQuestionErr('')
    setAssessmentErr('')
  }, [])

  const loadAssessmentForEdit = useCallback(
    async (assessmentId) => {
      const response = await fetch(
        `${API_BASE}/api/assessments/${assessmentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load assessment')
      }

      setTitle(data.assessment.title)
      setType(data.assessment.assess_type)
      setDuration(data.assessment.duration)
      setMaxGrade(data.assessment.max_grade)
      setDueDate(parseDueDateForInput(data.assessment.due_date))
      setDueTime(parseDueTimeForInput(data.assessment.due_time))
      setWindowSwitching(data.securitySettings.windowswitching)
      setClipboardAccess(data.securitySettings.clipboardaccess)
      setScreenSnapshot(data.securitySettings.screensnapshot)
      setQuestionStats(data.securitySettings.questionstats)
      setQuestionsList(
        data.questions.map((question) => ({
          id: question.question_id,
          qType: question.question_type,
          qPrompt: question.prompt,
          qMaxGrade: question.max_grade,
          progLang: question.prog_lang,
          langVersion: question.lang_version,
          options: question.options || [],
          codeSnippet: question.code_snippet || '',
          needCodeSnippet: question.code_snippet ? true : false,
        }))
      )
      setEditingAssessment({ assessment_id: assessmentId })
    },
    [token]
  )

  const applyNavigationIntent = useCallback(async () => {
    if (assessmentToEdit?.assessment_id) {
      await loadAssessmentForEdit(assessmentToEdit.assessment_id)
      return
    }

    if (assessmentType) {
      setType(assessmentType)
    }
  }, [assessmentToEdit, assessmentType, loadAssessmentForEdit])

  useEffect(() => {
    let active = true
    skipDraftPersistRef.current = false

    const applyNavIntent = async () => {
      const toEdit = location.state?.assessmentToEdit
      const navType = location.state?.assessmentType || ''

      if (toEdit?.assessment_id) {
        await loadAssessmentForEdit(toEdit.assessment_id)
        return
      }

      if (navType) {
        setType(navType)
      }
    }

    const initializeStudio = async () => {
      setDraftResolved(false)
      setShowDraftModal(false)
      setPendingDraft(null)

      const savedDraft = loadDraft(courseId)
      const hasDraft = savedDraft && !isDraftEmpty(savedDraft)
      const enteredFromSidebar = location.state?.fromSidebar === true

      if (!hasDraft) {
        try {
          await applyNavIntent()
        } catch (error) {
          console.error('Failed to initialize assessment studio', error)
          if (active) {
            setAssessmentErr(error.message || 'Failed to load assessment')
          }
        }
        if (active) setDraftResolved(true)
        return
      }

      if (enteredFromSidebar) {
        applyDraft(savedDraft)
        if (active) setDraftResolved(true)
        return
      }

      if (active) {
        setPendingDraft(savedDraft)
        setShowDraftModal(true)
      }
    }

    void initializeStudio()

    return () => {
      active = false
    }
  }, [applyDraft, courseId, loadAssessmentForEdit, location.key])

  draftSnapshotRef.current = buildDraftSnapshot()

  useEffect(() => {
    return () => {
      if (!courseId || skipDraftPersistRef.current) return
      const snapshot = draftSnapshotRef.current
      if (snapshot && !isDraftEmpty(snapshot)) {
        saveDraft(courseId, snapshot)
      }
    }
  }, [courseId])

  useEffect(() => {
    if (!draftResolved || showDraftModal || skipDraftPersistRef.current) return

    const snapshot = buildDraftSnapshot()
    if (!isDraftEmpty(snapshot)) {
      saveDraft(courseId, snapshot)
    }
  }, [buildDraftSnapshot, courseId, draftResolved, showDraftModal])

  const handleContinueDraft = () => {
    const draft = pendingDraft ?? loadDraft(courseId)
    if (draft) {
      applyDraft(draft)
    }
    setPendingDraft(null)
    setShowDraftModal(false)
    setDraftResolved(true)
  }

  const handleDiscardDraft = async () => {
    clearDraft(courseId)
    resetFormState()
    setPendingDraft(null)
    setShowDraftModal(false)

    try {
      await applyNavigationIntent()
    } catch (error) {
      console.error('Failed to load assessment', error)
      setAssessmentErr(error.message || 'Failed to load assessment')
    }

    setDraftResolved(true)
  }

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
      langVersion,
      options: [...options],
      codeSnippet: needCodeSnippet ? codeSnippet : null,
    }

    if (activeQuestionForm && activeQuestionForm !== 'new') {
      setQuestionsList(
        questionsList.map((q) =>
          q.id === activeQuestionForm ? { ...q, ...questionData } : q
        )
      )
    } else {
      setQuestionsList([
        ...questionsList,
        { id: `new-${crypto.randomUUID()}`, ...questionData },
      ])
    }

    resetQForm()
  }

  const handleEditQuestion = (question) => {
    setActiveQuestionForm(question.id)
    setQType(question.qType)
    setQPrompt(question.qPrompt)
    setQMaxGrade(question.qMaxGrade)
    setprogLang(question.progLang || '')
    setLangVersion(question.langVersion || '')
    setNeedCodeSnippet(question.codeSnippet ? true : false)
    setCodeSnippet(question.codeSnippet || '')
    setOptions([...(question.options || [])])
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
    setLangVersion('')
    setNeedCodeSnippet(false)
    setCodeSnippet('')
    setOptions([])
    setQuestionErr('')
  }

  const openNewQuestionForm = () => {
    setActiveQuestionForm('new')
    setQType('')
    setQPrompt('')
    setQMaxGrade(0)
    setprogLang('')
    setLangVersion('')
    setNeedCodeSnippet(false)
    setCodeSnippet('')
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
      <div className="form-group form-group--question-type">
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
      <div className="form-group form-group--question-prompt">
        <label htmlFor={`${idPrefix}-question-prompt`}>Prompt</label>
        <input
          type="text"
          id={`${idPrefix}-question-prompt`}
          name={`${idPrefix}-question-prompt`}
          value={qPrompt}
          onChange={(e) => setQPrompt(e.target.value)}
        />
      </div>

      <div className="form-group form-group--code-snippet-toggle">
        <label htmlFor={`${idPrefix}-question-need-code-snippet`}>
          Add Code Snippet
        </label>
        <input
          type="checkbox"
          className="code-snippet-toggle"
          id={`${idPrefix}-question-need-code-snippet`}
          name={`${idPrefix}-question-need-code-snippet`}
          checked={needCodeSnippet}
          onChange={(e) => setNeedCodeSnippet(e.target.checked)}
        />
      </div>

      {needCodeSnippet && (
        <div className="code-snippet-workspace">
          <div className="code-snippet-workspace-header">
            <span className="code-snippet-workspace-label">Code</span>
            <span className="code-snippet-workspace-hint">
              Shown to students with the question
            </span>
          </div>
          <div className="code-snippet-workspace-body">
            <Editor
              height="200px"
              theme="vs-dark"
              language="cpp"
              value={codeSnippet}
              onChange={(value) => setCodeSnippet(value)}
            />
          </div>
        </div>
      )}
      <div className="form-group form-group--question-points">
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
        <div className="form-group form-group--prog-lang">
          <label htmlFor={`${idPrefix}-question-prog-lang`}>
            Programming Language
          </label>
          <select
            className="prog-lang-select"
            id={`${idPrefix}-question-prog-lang`}
            name={`${idPrefix}-question-prog-lang`}
            value={progLang ? `${progLang} ${langVersion}` : ''}
            onChange={(e) => {
              const [lang, version] = e.target.value.split(' ')
              setprogLang(lang)
              setLangVersion(version)
            }}
          >
            <option value="" disabled>
              Select Programming Language
            </option>
            <option value="cpp 10.2.0">C++ 10.2.0</option>
            <option value="python 3.12.0">Python 3.12.0</option>
          </select>
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
            <div className="form-group mcq-options-panel">
              <label htmlFor={`${idPrefix}-question-options`}>Options</label>
              {options.map((option, index) => (
                <div key={index} className="mcq-option-row">
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
                    aria-label={`Delete option ${index + 1}`}
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

  const handleSaveAssessment = async (e) => {
    e.preventDefault()
    setAssessmentErr('')
    if (!title || !type || !maxGrade || !dueDate || !dueTime) {
      setAssessmentErr('All Assessment details are required')
      return
    }

    if ((type === 'EXAM' || type === 'QUIZ') && !duration) {
      setAssessmentErr('Duration is required for timed assessments')
      return
    }

    if (questionsList.length === 0) {
      setAssessmentErr('At least one question is required')
      return
    }

    if (isDueDateTimeInPast(dueDate, dueTime)) {
      setAssessmentErr('Due date and time must be in the future')
      return
    }

    let totalPoints = 0
    for (const question of questionsList) {
      totalPoints += Number(question.qMaxGrade)
    }
    if (totalPoints !== Number(maxGrade)) {
      setAssessmentErr(
        'Total sum of question points must be equal to the max grade.'
      )
      return
    }

    const assessmentPayload = {
      title,
      type,
      duration,
      maxGrade,
      dueDate,
      dueTime,
      securitySettings: {
        windowSwitching,
        clipboardAccess,
        screenSnapshot,
        questionStats,
      },
      questions: questionsList,
    }

    try {
      const response = await fetch(`${API_BASE}/api/assessments/${courseId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assessmentPayload),
      })
      const data = await response.json()
      if (!response.ok)
        throw new Error(data.error || 'Failed to create assessment')
      skipDraftPersistRef.current = true
      clearDraft(courseId)
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Failed to create assessment', error)
      setAssessmentErr(error.message || 'Failed to create assessment')
    }
  }

  const handleDiscardAssessment = () => {
    setShowDiscardModal(false)
    const path =
      type === 'ASSIGNMENT'
        ? `/course/${courseId}/assignments`
        : type === 'EXAM'
          ? `/course/${courseId}/exams`
          : `/course/${courseId}/quizzes`
    skipDraftPersistRef.current = true
    clearDraft(courseId)
    resetFormState()
    navigate(path)
  }

  const handleUpdateAssessment = async (e) => {
    e.preventDefault()
    setAssessmentErr('')
    if (!title || !type || !maxGrade || !dueDate || !dueTime) {
      setAssessmentErr('All Assessment details are required')
      return
    }

    if ((type === 'EXAM' || type === 'QUIZ') && !duration) {
      setAssessmentErr('Duration is required for timed assessments')
      return
    }

    if (questionsList.length === 0) {
      setAssessmentErr('At least one question is required')
      return
    }

    if (isDueDateTimeInPast(dueDate, dueTime)) {
      setAssessmentErr('Due date and time must be in the future')
      return
    }

    let totalPoints = 0
    for (const question of questionsList) {
      totalPoints += Number(question.qMaxGrade)
    }
    if (totalPoints !== Number(maxGrade)) {
      setAssessmentErr(
        'Total sum of question points must be equal to the max grade.'
      )
      return
    }

    const assessmentPayload = {
      title,
      type,
      duration,
      maxGrade,
      dueDate,
      dueTime,
      securitySettings: {
        windowSwitching,
        clipboardAccess,
        screenSnapshot,
        questionStats,
      },
      questions: questionsList,
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/assessments/${editingAssessment.assessment_id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(assessmentPayload),
        }
      )
      const data = await response.json()
      if (!response.ok)
        throw new Error(data.error || 'Failed to update assessment')
      skipDraftPersistRef.current = true
      clearDraft(courseId)
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Failed to update assessment', error)
      setAssessmentErr(error.message || 'Failed to update assessment')
    }
  }

  const isFormOpen = activeQuestionForm !== null
  const hasQuestions = questionsList.length > 0 || activeQuestionForm === 'new'

  if (!draftResolved) {
    return (
      <div className="assessment-studio-page">
        <div className="course-special-header">
          <FontAwesomeIcon icon={faFilePen} />
          <span> / </span>
          <p>Assessment Studio</p>
        </div>
        {showDraftModal && (
          <div className="draft-modal-backdrop">
            <div className="draft-modal">
              <h3>Continue your draft?</h3>
              <p>
                You have an unsaved assessment draft for this course. Would you
                like to continue where you left off or start fresh?
              </p>
              <div className="draft-modal-actions">
                <button
                  type="button"
                  className="draft-modal-btn draft-modal-btn--discard"
                  onClick={handleDiscardDraft}
                >
                  Discard draft
                </button>
                <button
                  type="button"
                  className="draft-modal-btn draft-modal-btn--continue"
                  onClick={handleContinueDraft}
                >
                  Continue draft
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
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
              <label htmlFor="duration">Duration (in minutes)</label>
              <input
                type="number"
                id="duration"
                name="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Enter duration in minutes"
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

          <div className="form-group">
            <label htmlFor="due-time">Due Time</label>
            <input
              type="time"
              id="due-time"
              name="due-time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
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
              checked={windowSwitching}
              onChange={(e) => setWindowSwitching(e.target.checked)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="clipboard-access">Clipboard Access</label>
            <input
              type="checkbox"
              id="clipboard-access"
              name="clipboard-access"
              checked={clipboardAccess}
              onChange={(e) => setClipboardAccess(e.target.checked)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="screen-snapshot">Screen Snapshot</label>
            <input
              type="checkbox"
              id="screen-snapshot"
              name="screen-snapshot"
              checked={screenSnapshot}
              onChange={(e) => setScreenSnapshot(e.target.checked)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="question-stats">Question Stats</label>
            <input
              type="checkbox"
              id="question-stats"
              name="question-stats"
              checked={questionStats}
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
                        {question.codeSnippet && (
                          <div className="question-row-code-snippet">
                            <strong>Code snippet:</strong>
                            <pre className="question-row-code-snippet-preview">
                              <code>{question.codeSnippet}</code>
                            </pre>
                          </div>
                        )}
                        <strong>Points:</strong>
                        <p>{question.qMaxGrade}</p>
                        {question.progLang && (
                          <>
                            <strong>Programming Language:</strong>
                            <p>
                              {question.progLang}{' '}
                              <span className="lang-version">
                                {question.langVersion}
                              </span>
                            </p>
                          </>
                        )}
                        {question.qType === 'MCQ' &&
                          (question.options || []).length > 0 && (
                            <div className="question-row-options">
                              <strong>Options:</strong>
                              <ul>
                                {(question.options || []).map(
                                  (option, optionIndex) => (
                                    <li key={optionIndex}>{option}</li>
                                  )
                                )}
                              </ul>
                            </div>
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
          onClick={
            editingAssessment ? handleUpdateAssessment : handleSaveAssessment
          }
        >
          {editingAssessment ? 'Update Assessment' : 'Save Assessment'}
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

      {showSuccessModal && (
        <div className="success-modal-backdrop">
          <div className="success-modal">
            <h3>
              {editingAssessment ? 'Assessment Updated' : 'Assessment Created'}
            </h3>
            {editingAssessment ? (
              <p>Assessment has been updated successfully.</p>
            ) : (
              <p>Assessment has been created successfully.</p>
            )}

            <button
              type="button"
              className="success-modal-btn"
              onClick={() => {
                const path =
                  type === 'ASSIGNMENT'
                    ? `/course/${courseId}/assignments`
                    : type === 'EXAM'
                      ? `/course/${courseId}/exams`
                      : `/course/${courseId}/quizzes`
                skipDraftPersistRef.current = true
                clearDraft(courseId)
                navigate(path)
                setShowSuccessModal(false)
              }}
            >
              Go to{' '}
              {type === 'ASSIGNMENT'
                ? 'Assignments'
                : type === 'EXAM'
                  ? 'Exams'
                  : 'Quizzes'}{' '}
              Page
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AssessmentStudioPage

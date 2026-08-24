import { useState, useEffect } from 'react';

interface AssignedTaskCellProps {
  task: string | null | undefined;
}

const AssignedTaskCell = ({ task }: AssignedTaskCellProps) => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!showModal) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showModal]);

  if (!task || !task.trim()) {
    return <span className="not-available">--</span>;
  }

  return (
    <>
      <span
        className="assigned-task-text"
        onClick={() => setShowModal(true)}
        role="button"
        tabIndex={0}
        title="Click to view full task"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setShowModal(true);
          }
        }}
      >
        <span className="assigned-task-text-truncate">{task}</span>
        <span className="assigned-task-view">View</span>
      </span>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-content assigned-task-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="assigned-task-modal-header">
              <h3>Assigned Task</h3>
              <button
                onClick={() => setShowModal(false)}
                className="close-button"
                type="button"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="assigned-task-full-text">{task}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default AssignedTaskCell;

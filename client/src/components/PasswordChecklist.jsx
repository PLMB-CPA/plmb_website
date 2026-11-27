import { PASSWORD_RULES } from '../util/passwordRules';
import './PasswordChecklist.css';

function PasswordChecklist({ password, className = '' }) {
    return (
        <div className={`pw-checklist ${className}`}>
            <strong>Password must have</strong>
            <ul>
                {PASSWORD_RULES.map(rule => {
                    const met = rule.test(password);
                    return (
                        <li key={rule.id} className={met ? 'met' : ''}>
                            <span className="pw-mark" aria-hidden="true">{met ? '✓' : '○'}</span>
                            <span>{rule.label}</span>
                            <span className="pw-sr">{met ? ' (met)' : ' (not met)'}</span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export default PasswordChecklist;

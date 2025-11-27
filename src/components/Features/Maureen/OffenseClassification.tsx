// File Created for Maureen's safety tips and a resource hub
import React from "react";
import "./OffenseClassification.css"

// Function for all JS or TS functions they should handle the logic
function OffenseClassification() {
  //HTML Code handling Visual Structure
  return (
    <>
      <div className="section-header">
        <h2>
          Offense <span className="highlight">Classification</span>
        </h2>
        <p>
          Sometimes it can be difficult to know how to classify a situation that needs to be reported. Here are
          some definitions that should make it easier to decide.
        </p>
      </div>
      <div className="classification-grid">
        <div className="classification-card">
          <h3>Uncomfortable Situation</h3>
          <p>
            Situations that made you feel uneasy or uncomfortable. 
            This broad definition can include any situation in which someone's actions made you weary or uncomfortable.
          </p>
        </div>
        <div className="classification-card">
          <h3>Sexual Misconduct</h3>
          <p>
            Any unwelcome behavior of a sexual nature that is committed without consent or by force, intimidation, coercion, or manipulation. 
            This includes sexual harassment, sexual assualt, and rape.
          </p>
        </div>
        <div className="classification-card">
          <h3>Physical Aggression</h3>
          <p>
            The use of physical force to harm or intimidate others. Physical aggression involves the intent to cause injury or harm to another person.
            This can include actions such as hitting, shoving, punching, kicking, or any other acts that cause physical harm.
          </p>
        </div>
        <div className="classification-card">
          <h3>Verbal Aggression</h3>
          <p>
            Deliberately harmful, threatening, or abusive language or behavior that is typically both unprovoked and repeated.
          </p>
        </div>
        <div className="classification-card">
          <h3>Discrimination</h3>
          <p>
            The act, practice, or an instance of unfairly treating a person or group differently from other people or groups 
            on a class or categorical basis (such as race, religion, gender, or sexual orientation).
          </p>
        </div>
        <div className="classification-card">
          <h3>Links with Additional Information and Statistics:</h3>
          <ol>
            <li><a href="https://www.nsvrc.org/what-do-you-need-know-about-sexual-assault-college-campuses/">Statistics About Sexual Assault on College Campuses</a></li>
            <li><a href="https://cultureofrespect.org/sexual-violence/statistics-at-a-glance/index.html">Statistics About Sexual Violence</a></li>
            <li><a href="https://www.nsvrc.org/lets-talk-campus/definitions-of-terms/">More Definitions on Sexual Violence</a></li>
          </ol>
        </div>
      </div>
    </>
  );
}

export default OffenseClassification;
// HTML ELement to add in other tsx files
// <OffenseClassification />;

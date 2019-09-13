import React, { Component } from 'react';
export default  class Resume extends Component {
  render() {
    let resumeData = this.props.resumeData;
    let {language_dict} = resumeData;
    let total = Object.values(language_dict).reduce((a, v) => a + v, 0);
    let min = Math.min(Object.values(language_dict));
    // total = total - min;
    let adjusted_languages = []
    for (let language in language_dict) {
      let adjusted = language_dict[language] / 600000;
      if (language === "Java") {
        adjusted = language_dict[language] / 10000000;
      }
      let stringTotal = Math.round(language_dict[language] / 1000) + 'k';
      adjusted_languages.push({language, 
        percent:adjusted, 
        total: stringTotal});
    }
    adjusted_languages = adjusted_languages.sort((({percent: a}, {percent:b}) => b - a));
    return (
      <section id="resume">
         <div className="row education">

            <div className="three columns header-col">
               <h1><span>Education</span></h1>
            </div>

            <div className="nine columns main-col">
              {
                resumeData.education && resumeData.education.map((item)=>{
                  let ending = (<span />);
                  if (item.MonthEnded) {
                    ending = <span>- {item.MonthEnded} {item.YearEnded} </span>
                  }
                  return(
                    <div className="row item">
                       <div className="twelve columns">
                          <h3>{item.UniversityName}</h3>
                          <p className="info">
                          {item.specialization}
                          <span>&bull;</span> <em className="date">{item.MonthOfPassing} {item.YearOfPassing} {ending}</em></p>
                          <h6>Relevant Coursework</h6>
                          <p>
                          {item.relevantCoursework}
                          </p>
                          <h6>Achievements</h6>
                          <p>
                          {item.Achievements}
                          </p>
                       </div>
                    </div>
                  )
                })
              }
            </div>
         </div>
        <div className="row work">
            <div className="three columns header-col">
               <h1><span>Work</span></h1>
            </div>

            <div className="nine columns main-col">
              {
                resumeData.work && resumeData.work.map((item) => {
                  let ending = (<span />);
                  if (item.MonthEnded) {
                    ending = <span>- {item.MonthEnded} {item.YearEnded} </span>
                  }
                  return(
                    <div className="row item">
                       <div className="twelve columns">
                          <h3>{item.CompanyName}</h3>
                          <p className="info">
                          {item.specialization}
                          <span>&bull;</span> <em className="date">{item.MonthOfLeaving} {item.YearOfLeaving} {ending}</em></p>
                          <p>
                          {item.Achievements}
                          </p>
                       </div>

                    </div>

                  )
                })
              }
            </div> 
         </div>


         <div className="row skill">

            <div className="three columns header-col">
               <h1><span>Skills</span></h1>
            </div>

            <div className="nine columns main-col">

               <h3>
               {resumeData.skillsDescription}
               </h3>

   				<div className="bars">

   				   <ul className="skills">
                {/* {
                  resumeData.skills && resumeData.skills.map((item) => {
                    return(
                      <li>
                      <span className={`bar-expand ${item.skillname.toLowerCase()}`} style={{width:item.skillname.length * 10 + '%'}}>
                      </span><em>{item.skillname}</em>
                      </li>
                    )
                  })
                } */}

              {
                  adjusted_languages.map(({language, percent, total}) => {
                    return(
                      <li>
                      <span className={`bar-expand ${language}`} style={{width: percent * 100 + '%'}}>
                      </span><em>{language} {total} lines</em>
                      </li>
                    )
                  })
                }

   					</ul>

   				</div>

   			</div>

         </div>

      </section>
    );
  }
}
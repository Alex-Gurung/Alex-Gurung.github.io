import React, { Component } from 'react';
export default class Porfolio extends Component {
  render() {
    let resumeData = this.props.resumeData;
    return (
      <section id="portfolio">
      <div className="row">
        <div className="twelve columns collapsed">
          <h1 style={{fontSize: '3rem'}}>Here's My&nbsp;
          <span><a target="_blank" href="static/Alexander_Gurung_resume_Sept2019.pdf" style={{textDecoration:'none'}}>Resume!</a></span>
          </h1>
          <div id="portfolio-wrapper" className="bgrid-quarters s-bgrid-thirds cf">
          {
            resumeData.portfolio && resumeData.portfolio.map((item)=>{
              return(
                <div />
                // <div>
                //   <div style={{display: 'flex', flexDirection: 'row', marginBottom: 20}}> 
                //     <img alt={item.name} src={`${item.imgurl}`} className="item-img" style={{width:'25%'}}/>
                //     <h1 style={{fontSize: '2.5rem', textAlign: 'center', paddingLeft: '25%'}}>{item.name}</h1>
                //   </div>
                // </div>
                // <div className="columns portfolio-item">
                //   <div className="item-wrap">
                //     <a href="#modal-01">
                //       <img alt={item.name} src={`${item.imgurl}`} className="item-img"/>
                //       <div className="overlay">
                //         <div className="portfolio-item-meta">
                //           <h5>{item.name}</h5>
                //           <p>{item.description}</p>
                //         </div>
                //       </div>
                //     </a>
                //   </div>
                // </div>
              )
            })
          }
          </div>
        </div>
      </div>
  </section>
        );
  }
}
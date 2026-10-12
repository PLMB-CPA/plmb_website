import './Services.css';

function Services(){
    return(
        <>
        <div className="service-container">
            <h2> Our Services </h2>
            <div className="services">
            <div className="container">
                <h3> Audit and Assurance </h3>
                <p> We deliver independent, objective assurance services designed to enhance the credibility 
                    of your financial statements and strengthen your organizational governance. </p>
                <ul> 
                    <li><b>Statutory Financial Audits </b>
                           Comprehensive examination of financial records to ensure full compliance with the Philippine Financial Reporting Standards (PFRS).  </li>
                    <li><b>Technical Standards & Quality Control</b>
                           Rigorous internal reviews led by our quality control specialists to ensure every audit report seamlessly passes regulatory scrutiny.  </li>
                    <li><b>Internal Control Evaluation</b>
                           Critical assessment of your existing internal workflows to detect compliance gaps, prevent fraud, and mitigate operational risks.  </li>
                </ul>
            </div>  
            <div className="container">
                <h3> Tax Advisory and Compliance </h3>
                <p> We help organizations navigate the complex and ever-changing Philippine tax landscape while
                legally optimizing their tax exposure.</p>
                <ul>
                <li><b>Corporate Tax Compliance</b>
                       Seamless preparation, review, and electronic filing of monthly, quarterly, and annual BIR tax returns.  </li>
                <li><b>Tax Advisory & Planning</b>
                       Strategic structuring of commercial transactions to minimize tax liabilities and ensure alignment with recent tax reforms.  </li>
                <li><b>BIR Audit Defense & Assessment</b>
                       Expert technical assistance and representation during Bureau of Internal Revenue (BIR) letter of authority (LOA) audits.  </li>
                </ul>
            </div>
            <div className="container">
                <h3> Management Consultancy </h3>
                <p> We look beyond traditional historical numbers to turn your financial data into a forward-looking
                management information resource.</p>
                <ul>
                <li><b>Business Process Optimization</b>
                        Designing robust risk management frameworks and internal controls tailored to your specific industry dynamics.  </li>
                <li><b>Financial Performance Analysis</b>
                        In-depth review of financial health to help management make data-driven, strategic growth decisions.  </li>
                <li><b>Corporate Secretarial & Compliance</b>
                        Assistance with SEC reporting, local business permit renewals, and other statutory corporate maintenance.  </li>
                </ul>
            </div>
            </div>

            <h2> Industries We Serve </h2>
            <div className="services">
            <div className = "container">
                <p> 
                At Po Lao Marquez Benedictos & Co., we combine our technical accounting expertise with deep 
                sector insights to deliver tailored solutions. We understand that each industry faces distinct
                regulatory landscapes, operational hurdles, and tax structures.
                   
                We proudly provide premium audit, tax, and advisory services to the following sectors across the Philippines:
                  
                </p>
                <div className ="small-container">
                <h3> Healthcare and Medical Practices </h3>
                <p> Delivering specialized accounting, tax, and audit compliance for private clinics, medical 
                    practitioners, foundations, and major healthcare facilities.</p>
                </div>  
                <div className="small-container">
                <h3> Professional and Corporate Services </h3>
                <p> Streamlining financial workflows, statutory bookkeeping, and corporate compliance for expanding
                    service entities and corporate groups.</p>
                </div>
                <div className="small-container">
                <h3> Real Estate and Property Development </h3>
                <p> Navigating complex revenue recognition standards, asset valuations, and specialized tax structures 
                    under current Philippine tax laws.</p>
                </div>
                <div className="small-container">
                <h3> Retail and Consumer Goods </h3>
                <p> We provide comprehensive compliance services to help businesses adhere to applicable laws, 
                    regulations, and industry standards. Our approach ensures proper regulatory alignment, 
                    minimizes risk exposure, and supports the maintenance of strong and responsible business 
                    practices.</p>
                </div>
                <div className="small-container">
                <h3> Non-Profit and Foundations </h3>
                <p> Ensuring strict transparency, statutory audit compliance, and proper monitoring of project fund
                    allocations under corporate charters.</p>
                </div>
            </div>
            </div>
        </div>
        </>
    )
}

export default Services;

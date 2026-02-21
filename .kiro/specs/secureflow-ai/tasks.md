# Implementation Plan: SecureFlow AI

## Overview

This implementation plan breaks down the SecureFlow AI MVP into discrete, executable tasks organized by functional area. The plan prioritizes getting a working analysis flow first, then adding history functionality, and finally polishing the UI for demo presentation. Each task is designed to be completable in 1-3 hours and builds incrementally on previous work.

The implementation uses TypeScript throughout: Next.js for the frontend, AWS CDK for infrastructure, and Node.js 20.x for Lambda functions.

## Tasks

### 1. Project Setup and Configuration

- [ ] 1.1 Initialize project structure and dependencies
  - Create root directory structure with `infra/` and `web/` folders
  - Initialize `infra/` with CDK TypeScript project (`cdk init app --language typescript`)
  - Initialize `web/` with Next.js TypeScript project (`npx create-next-app@latest`)
  - Configure TypeScript strict mode in both projects
  - Set up `.gitignore` files for both projects
  - Create root `README.md` with project overview and setup instructions
  - _Requirements: 15.5_
  - **Definition of Done:** Both projects initialized, dependencies installed, TypeScript compiles without errors

- [ ] 1.2 Configure development environment and tooling
  - Install and configure ESLint with TypeScript rules
  - Install and configure Prettier for code formatting
  - Set up Jest testing framework in both projects
  - Install fast-check for property-based testing
  - Create npm scripts for common tasks (build, test, lint, format)
  - Configure VS Code settings for consistent formatting
  - _Requirements: 15.3_
  - **Definition of Done:** Linting and formatting work, Jest runs successfully (even with no tests yet)

### 2. Infrastructure Setup (AWS CDK)

- [ ] 2.1 Create CDK stack with core AWS resources
  - Define `SecureFlowStack` class in `infra/lib/secureflow-stack.ts`
  - Create DynamoDB table with partition key `userId` and sort key `timestamp`
  - Create S3 bucket for raw submissions with encryption enabled
  - Configure S3 bucket with block public access and lifecycle policy (90-day deletion)
  - Add CDK context values for configuration (model ID, region, limits)
  - _Requirements: 8.1, 8.3, 8.4, 14.2_
  - **Definition of Done:** `cdk synth` generates CloudFormation template with DynamoDB table and S3 bucket

- [ ] 2.2 Create Lambda function and API Gateway
  - Define Lambda function construct with Node.js 20.x runtime
  - Configure Lambda with 512 MB memory and 30-second timeout
  - Set Lambda environment variables from CDK context
  - Create API Gateway REST API with CORS enabled
  - Define `/analyze` POST endpoint with Lambda integration
  - Define `/history` GET endpoint with Lambda integration
  - Configure API Gateway throttling (10 req/sec, 100 burst)
  - _Requirements: 8.1, 8.2, 2.1_
  - **Definition of Done:** `cdk synth` includes Lambda function and API Gateway with both endpoints

- [ ] 2.3 Configure IAM roles and permissions
  - Create Lambda execution role with least-privilege permissions
  - Add Bedrock `InvokeModel` permission for specified model
  - Add DynamoDB `PutItem` and `Query` permissions
  - Add S3 `PutObject` permission for submissions bucket
  - Add CloudWatch Logs permissions
  - Enable X-Ray tracing for Lambda function
  - _Requirements: 14.4, 16.4_
  - **Definition of Done:** CDK stack includes IAM role with all required permissions, no overly broad policies

- [ ] 2.4 Deploy infrastructure to AWS
  - Run `cdk bootstrap` (if first time)
  - Run `cdk deploy` to create all resources
  - Verify all resources created successfully in AWS Console
  - Save API Gateway URL and other outputs
  - Test API Gateway health endpoint (if implemented)
  - _Requirements: 8.6_
  - **Definition of Done:** All AWS resources deployed, API Gateway URL accessible, CloudWatch logs show Lambda initialization

### 3. Backend Core Implementation

- [ ] 3.1 Implement Lambda handler routing and request validation
  - Create `src/handler.ts` with main Lambda handler function
  - Implement routing logic for POST `/analyze` and GET `/history`
  - Create input validation functions for analyze requests
  - Validate content field (non-empty, max 50KB)
  - Validate contentType field (enum: code, terraform, yaml, dockerfile)
  - Return 400 errors with descriptive messages for validation failures
  - Return 404 for unknown routes
  - _Requirements: 2.2, 2.3, 2.4, 11.2, 14.6_
  - **Definition of Done:** Handler routes requests correctly, validation rejects invalid inputs with 400 errors

- [ ] 3.2 Write property tests for request validation
  - **Property 5: Empty content rejection**
  - **Property 6: Invalid content type rejection**
  - **Validates: Requirements 2.3, 2.4**
  - Generate random invalid requests (empty content, invalid contentType)
  - Verify all return 400 status with error messages
  - Run 100 iterations per property
  - _Requirements: 2.3, 2.4_
  - **Definition of Done:** Property tests pass, covering empty/invalid input scenarios

- [ ] 3.3 Implement Bedrock integration and prompt construction
  - Create `src/bedrock.ts` module for Bedrock operations
  - Implement `analyzeContent()` function that invokes Bedrock
  - Construct prompt with content type context and user content
  - Truncate input content to 4000 characters maximum
  - Configure Bedrock request: Claude 3 Haiku model, max_tokens=2000, temperature=0.3
  - Handle Bedrock API errors with try-catch
  - Return 500 error with user-friendly message on Bedrock failures
  - _Requirements: 3.1, 3.6, 3.7, 9.1, 9.2_
  - **Definition of Done:** Bedrock API called successfully with properly formatted prompt, errors handled gracefully

- [ ] 3.4 Write property tests for Bedrock integration
  - **Property 7: Bedrock invocation with content**
  - **Property 26: Prompt size limitation**
  - **Validates: Requirements 3.1, 3.6, 9.1**
  - Generate random content of various sizes
  - Verify Bedrock called with content and contentType in prompt
  - Verify prompts truncated to 4000 characters
  - Mock Bedrock API for testing
  - _Requirements: 3.1, 3.6, 9.1_
  - **Definition of Done:** Property tests verify Bedrock called correctly with truncated prompts

- [ ] 3.5 Implement Bedrock response parsing and validation
  - Create `src/parser.ts` module for response parsing
  - Parse Bedrock JSON response with try-catch
  - Validate risk score is between 0-100
  - Validate each finding has all required fields (title, severity, category, whyItMatters, evidence, recommendedFix)
  - Validate severity enum (LOW, MEDIUM, HIGH, CRITICAL)
  - Validate category enum (Secrets, IAM, Network, Encryption, Compliance, General)
  - Return generic error finding if parsing fails
  - _Requirements: 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - **Definition of Done:** Parser extracts and validates all fields, handles malformed JSON gracefully

- [ ] 3.6 Write property tests for response parsing
  - **Property 8: Risk score range validation**
  - **Property 9: Finding structure completeness**
  - **Property 12: Severity enum validation**
  - **Property 13: Category enum validation**
  - **Validates: Requirements 3.2, 3.3, 4.2, 4.3**
  - Generate random Bedrock responses with various risk scores and findings
  - Verify risk scores always 0-100
  - Verify all findings have required fields
  - Verify severity and category enums validated
  - _Requirements: 3.2, 3.3, 4.2, 4.3_
  - **Definition of Done:** Property tests verify all parsing and validation logic

### 4. Data Persistence Implementation

- [ ] 4.1 Implement DynamoDB storage for analysis results
  - Create `src/storage.ts` module for data persistence
  - Implement `saveAnalysis()` function to store results in DynamoDB
  - Generate UUID for analysisId
  - Store all required fields: userId="demo-user", timestamp, contentType, riskScore, summary, findings, findingCount
  - Calculate findingCount from findings array length
  - Handle DynamoDB errors with try-catch (log but don't fail request)
  - Ensure original content NOT stored in DynamoDB
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 10.2_
  - **Definition of Done:** Analysis results stored in DynamoDB with all required fields, errors logged but don't block response

- [ ] 4.2 Write property tests for DynamoDB storage
  - **Property 15: DynamoDB persistence on success**
  - **Property 16: Partition key structure**
  - **Property 17: DynamoDB failure resilience**
  - **Property 18: Content exclusion from DynamoDB**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 10.2**
  - Generate random analysis results
  - Verify all stored with correct structure and userId="demo-user"
  - Verify original content never stored
  - Verify DynamoDB failures don't prevent response
  - Mock DynamoDB for testing
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 10.2_
  - **Definition of Done:** Property tests verify storage logic and resilience

- [ ] 4.3 Implement S3 storage for raw submissions
  - Add `saveRawSubmission()` function to `src/storage.ts`
  - Generate S3 key with date-based prefix: `submissions/YYYY/MM/DD/{analysisId}.txt`
  - Store raw content with metadata (content-type, analysis-id, timestamp)
  - Configure server-side encryption (SSE-S3)
  - Handle S3 errors with try-catch (log but don't fail request)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  - **Definition of Done:** Raw submissions stored in S3 with correct key structure and metadata, errors don't block analysis

- [ ] 4.4 Write property tests for S3 storage
  - **Property 19: S3 persistence on submission**
  - **Property 20: S3 key structure with date and ID**
  - **Property 21: S3 metadata inclusion**
  - **Property 22: S3 failure resilience**
  - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.6**
  - Generate random submissions with various content
  - Verify S3 keys follow date/ID format
  - Verify metadata included
  - Verify S3 failures don't prevent analysis
  - Mock S3 for testing
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_
  - **Definition of Done:** Property tests verify S3 storage logic and key structure

- [ ] 4.5 Implement history retrieval from DynamoDB
  - Add `getHistory()` function to `src/storage.ts`
  - Query DynamoDB with userId="demo-user", descending sort by timestamp
  - Limit results to 10 items
  - Return analysis summaries with: analysisId, timestamp, contentType, riskScore, findingCount, summary
  - Handle DynamoDB query errors with try-catch
  - Return empty array if no results
  - _Requirements: 7.2, 7.3, 10.3_
  - **Definition of Done:** History query returns last 10 analyses in correct format, handles empty results

- [ ] 4.6 Write property tests for history retrieval
  - **Property 23: History result limit**
  - **Property 24: History item completeness**
  - **Property 27: History without user filtering**
  - **Validates: Requirements 7.2, 7.3, 10.3**
  - Generate random sets of analyses in DynamoDB
  - Verify query returns at most 10 items
  - Verify all items have required fields
  - Verify no user-based filtering (all demo-user analyses returned)
  - Mock DynamoDB for testing
  - _Requirements: 7.2, 7.3, 10.3_
  - **Definition of Done:** Property tests verify history query logic and limits

### 5. Backend Integration and Error Handling

- [ ] 5.1 Wire together analyze endpoint end-to-end
  - Implement complete `/analyze` handler flow
  - Call validation → Bedrock analysis → response parsing → DynamoDB storage → S3 storage
  - Return structured JSON response with analysisId, timestamp, riskScore, summary, findings
  - Ensure DynamoDB and S3 failures don't block response (log only)
  - Add comprehensive error handling for all steps
  - _Requirements: 2.5, 3.4, 4.7_
  - **Definition of Done:** Complete analyze flow works end-to-end, returns correct response structure

- [ ] 5.2 Write integration tests for analyze endpoint
  - **Property 4: Valid request acceptance**
  - **Property 10: Summary field presence**
  - **Property 14: Findings array presence**
  - **Validates: Requirements 2.2, 2.5, 3.4, 4.7**
  - Test complete flow with mocked Bedrock/DynamoDB/S3
  - Verify 200 response with correct structure
  - Verify summary and findings array always present
  - Test with various content types
  - _Requirements: 2.2, 2.5, 3.4, 4.7_
  - **Definition of Done:** Integration tests verify complete analyze flow

- [ ] 5.3 Implement comprehensive error handling and logging
  - Add structured logging to all operations (CloudWatch)
  - Log Lambda execution details (request ID, duration, memory used)
  - Log Bedrock API calls (model, token count, latency)
  - Log DynamoDB and S3 operations (success/failure)
  - Log errors with stack traces and context
  - Ensure no sensitive data in logs (content, credentials)
  - Return consistent error response format: `{ error: string, code?: string }`
  - _Requirements: 11.1, 14.5, 16.1, 16.2, 16.3, 16.5_
  - **Definition of Done:** All operations logged appropriately, errors include context, no sensitive data in logs

- [ ] 5.4 Write property tests for error handling
  - **Property 11: Bedrock failure handling**
  - **Property 28: Error response structure**
  - **Property 29: Correct HTTP status codes**
  - **Property 31: Sensitive data exclusion from logs**
  - **Validates: Requirements 3.5, 11.1, 11.2, 11.3, 11.4, 14.5**
  - Generate various error scenarios (Bedrock failures, validation errors)
  - Verify correct status codes (400 for validation, 500 for server errors)
  - Verify error responses have correct structure
  - Verify logs don't contain sensitive patterns
  - _Requirements: 3.5, 11.1, 11.2, 11.3, 11.4, 14.5_
  - **Definition of Done:** Property tests verify error handling and logging

- [ ] 5.5 Checkpoint - Test complete backend locally
  - Run all unit and property tests (`npm test`)
  - Use AWS SAM or Lambda local testing to test handler
  - Verify analyze endpoint with sample Terraform file
  - Verify history endpoint returns results
  - Check CloudWatch logs for proper logging
  - Fix any failing tests or issues
  - _Requirements: All backend requirements_
  - **Definition of Done:** All tests pass, backend works locally with mocked AWS services

### 6. Frontend Implementation

- [ ] 6.1 Create analysis form component
  - Create `src/app/components/AnalysisForm.tsx`
  - Implement textarea for content input (max 50KB)
  - Implement dropdown for content type selection (code, terraform, yaml, dockerfile)
  - Implement submit button with loading state
  - Add input validation (prevent empty submission)
  - Display validation error messages
  - Style with Tailwind CSS for clean, professional look
  - _Requirements: 1.1, 1.2, 1.3, 1.6_
  - **Definition of Done:** Form renders correctly, validates input, shows loading state during submission

- [ ] 6.2 Write unit tests for analysis form
  - Test form renders with all required elements
  - Test validation prevents empty submission
  - Test content type dropdown has all options
  - Test loading indicator appears during submission
  - Use React Testing Library
  - _Requirements: 1.1, 1.3, 1.5, 1.6_
  - **Definition of Done:** Unit tests verify form behavior and validation

- [ ] 6.3 Implement API client for backend communication
  - Create `src/app/lib/api.ts` with API client functions
  - Implement `analyzeContent()` function to POST to `/analyze`
  - Implement `getHistory()` function to GET from `/history`
  - Add error handling for network failures
  - Add timeout handling (30 seconds)
  - Use fetch API with proper headers (Content-Type: application/json)
  - _Requirements: 1.4, 11.6_
  - **Definition of Done:** API client successfully calls backend endpoints, handles errors

- [ ] 6.4 Write property tests for API client
  - **Property 2: API call triggered on submission**
  - **Validates: Requirements 1.4**
  - Generate random valid requests
  - Verify API client constructs correct POST requests
  - Verify correct headers and payload structure
  - Mock fetch for testing
  - _Requirements: 1.4_
  - **Definition of Done:** Property tests verify API client behavior

- [ ] 6.5 Create results display component
  - Create `src/app/components/ResultsDisplay.tsx`
  - Display risk score with visual indicator (color-coded: green=low, yellow=medium, orange=high, red=critical)
  - Display summary text
  - Display findings list with expandable cards
  - Create `FindingCard.tsx` component for individual findings
  - Show severity badge, category, title, whyItMatters, evidence, recommendedFix
  - Style with Tailwind CSS for readability
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - **Definition of Done:** Results display correctly with all finding details, visually appealing

- [ ] 6.6 Implement error display and user feedback
  - Create `src/app/components/ErrorDisplay.tsx`
  - Display error messages from API responses
  - Show user-friendly messages for different error types (validation, network, server)
  - Add retry button for failed requests
  - Style error messages appropriately (red background, clear text)
  - _Requirements: 11.5, 11.6_
  - **Definition of Done:** Errors displayed clearly to users with appropriate messaging

- [ ] 6.7 Write property tests for error display
  - **Property 30: Frontend error display**
  - **Validates: Requirements 11.5, 11.6**
  - Generate various error responses
  - Verify error messages displayed in UI
  - Verify different error types handled correctly
  - _Requirements: 11.5, 11.6_
  - **Definition of Done:** Property tests verify error display logic

- [ ] 6.8 Create main analysis page
  - Update `src/app/page.tsx` as main analysis page
  - Integrate AnalysisForm, ResultsDisplay, and ErrorDisplay components
  - Manage state for form submission, loading, results, errors
  - Add demo disclaimer banner at top
  - Add page title and brief description
  - Implement responsive layout (mobile-friendly)
  - _Requirements: 1.1, 10.6_
  - **Definition of Done:** Main page works end-to-end, submits analysis and displays results

### 7. History Feature Implementation

- [ ] 7.1 Create history page and components
  - Create `src/app/history/page.tsx` for history route
  - Create `src/app/components/HistoryList.tsx` component
  - Display list of past analyses with timestamp, content type, risk score, finding count
  - Format timestamps as human-readable dates
  - Show empty state message when no history exists
  - Add navigation link from main page to history page
  - Style with Tailwind CSS for consistency
  - _Requirements: 7.1, 7.2, 7.3, 7.5_
  - **Definition of Done:** History page displays list of analyses, shows empty state when appropriate

- [ ] 7.2 Write unit tests for history page
  - Test history list renders with correct data
  - Test empty state displays when no analyses
  - Test timestamps formatted correctly
  - Use React Testing Library
  - _Requirements: 7.2, 7.3, 7.5_
  - **Definition of Done:** Unit tests verify history page rendering

- [ ] 7.3 Implement history item expansion
  - Add click handler to history items
  - Create `src/app/components/HistoryDetail.tsx` component
  - Display full analysis results when item clicked (risk score, summary, all findings)
  - Reuse FindingCard component for findings display
  - Add collapse functionality to hide details
  - Style expanded view for readability
  - _Requirements: 7.4_
  - **Definition of Done:** Clicking history items expands to show full details

- [ ] 7.4 Write property tests for history expansion
  - **Property 25: History item expansion**
  - **Validates: Requirements 7.4**
  - Generate random history items
  - Verify clicking items displays full details
  - Verify all findings shown in expanded view
  - _Requirements: 7.4_
  - **Definition of Done:** Property tests verify expansion behavior

### 8. Integration and End-to-End Testing

- [ ] 8.1 Deploy backend updates and test with real AWS services
  - Deploy latest Lambda code with `cdk deploy`
  - Test `/analyze` endpoint with real Bedrock API
  - Submit sample Terraform file with known security issues
  - Verify DynamoDB stores results correctly
  - Verify S3 stores raw submissions correctly
  - Check CloudWatch logs for errors
  - _Requirements: All backend requirements_
  - **Definition of Done:** Backend works with real AWS services, analysis completes successfully

- [ ] 8.2 Configure frontend to use deployed API
  - Update API client with deployed API Gateway URL
  - Set environment variable for API URL (`NEXT_PUBLIC_API_URL`)
  - Build frontend for production (`npm run build`)
  - Test locally with production build
  - Verify CORS working correctly
  - _Requirements: 1.4_
  - **Definition of Done:** Frontend successfully calls deployed backend API

- [ ] 8.3 End-to-end testing with real data
  - Test complete flow: submit Terraform file → view results → check history
  - Test with different content types (code, YAML, Dockerfile)
  - Test error scenarios (empty input, invalid content type, network failure)
  - Test history page with multiple analyses
  - Verify all findings display correctly
  - Test on different browsers (Chrome, Firefox, Safari)
  - Test on mobile devices (responsive design)
  - _Requirements: All requirements_
  - **Definition of Done:** Complete application works end-to-end with real AWS services

- [ ] 8.4 Checkpoint - Fix any integration issues
  - Review all test results and logs
  - Fix any bugs or issues discovered during testing
  - Re-run tests to verify fixes
  - Ensure all property tests passing (100 iterations each)
  - Ensure all unit tests passing
  - _Requirements: All requirements_
  - **Definition of Done:** All tests passing, no known bugs, application stable

### 9. Polish and Demo Preparation

- [ ] 9.1 Improve UI/UX for demo presentation
  - Add loading skeletons for better perceived performance
  - Improve color scheme and typography
  - Add icons for severity levels and categories
  - Add animations for smooth transitions
  - Improve mobile responsiveness
  - Add tooltips for better user guidance
  - Ensure consistent spacing and alignment
  - _Requirements: 1.5_
  - **Definition of Done:** UI looks polished and professional, ready for demo

- [ ] 9.2 Add demo disclaimer and branding
  - Add prominent disclaimer: "Demo Environment - Single User Mode"
  - Add SecureFlow AI branding (logo, tagline)
  - Add footer with competition information
  - Add "About" section explaining the tool
  - Ensure all text is clear and professional
  - _Requirements: 10.6_
  - **Definition of Done:** Branding and disclaimers in place, professional appearance

- [ ] 9.3 Create sample content for demo
  - Prepare 3-5 sample files with known security issues:
    - Terraform file with hardcoded credentials
    - YAML config with overly permissive IAM policies
    - Dockerfile with security vulnerabilities
    - Code snippet with SQL injection risk
  - Save samples in `demo-samples/` directory
  - Document expected findings for each sample
  - _Requirements: All requirements_
  - **Definition of Done:** Demo samples ready, findings documented

- [ ] 9.4 Performance optimization
  - Optimize Lambda cold start time (minimize dependencies)
  - Optimize frontend bundle size (code splitting, lazy loading)
  - Add caching headers for static assets
  - Verify API response times under 15 seconds for typical requests
  - Test with larger content (up to 50KB)
  - _Requirements: 12.1, 12.2_
  - **Definition of Done:** Application performs well, response times acceptable

- [ ] 9.5 Documentation and README updates
  - Update root README with:
    - Project overview and competition context
    - Architecture diagram
    - Setup and deployment instructions
    - Demo instructions
    - AWS Free Tier cost breakdown
  - Add inline code comments for complex logic
  - Create `DEMO.md` with demo script and talking points
  - Document known limitations and future enhancements
  - _Requirements: 15.2, 15.5_
  - **Definition of Done:** Documentation complete, clear, and professional

- [ ] 9.6 Final testing and validation
  - Run complete test suite (unit + property tests)
  - Verify all 34 properties tested and passing
  - Test complete demo flow with sample files
  - Verify AWS costs within Free Tier (check billing dashboard)
  - Test on fresh browser (clear cache) to simulate judge experience
  - Record demo video (optional but recommended)
  - _Requirements: All requirements_
  - **Definition of Done:** All tests passing, demo ready, costs within budget

- [ ] 9.7 Final checkpoint - Demo readiness review
  - Review all requirements and verify implementation
  - Test complete application one final time
  - Ensure all AWS resources properly configured
  - Verify monitoring and logging working
  - Prepare for competition submission
  - Celebrate! 🎉
  - _Requirements: All requirements_
  - **Definition of Done:** Application ready for competition demo, all requirements met

## Notes

- All tasks are required for comprehensive implementation
- Each task includes specific requirement references for traceability
- Checkpoints (5.5, 8.4, 9.7) ensure incremental validation and quality
- Property tests validate universal correctness properties across many inputs
- Unit tests validate specific examples and edge cases
- Total estimated time: 7-10 days for solo developer
- Priority order: Core analysis flow → History → Polish
- AWS costs: ~$2-3 for Bedrock during development/testing (only non-free service)

## Dependencies

- Task 2.4 depends on 2.1, 2.2, 2.3 (infrastructure must be defined before deployment)
- Task 3.3 depends on 3.1 (routing must work before Bedrock integration)
- Task 3.5 depends on 3.3 (Bedrock must be called before parsing response)
- Task 4.1 depends on 3.5 (need parsed results before storing)
- Task 4.3 depends on 3.1 (need request data before storing to S3)
- Task 4.5 depends on 4.1 (need stored data before retrieving history)
- Task 5.1 depends on 3.1, 3.3, 3.5, 4.1, 4.3 (all components must exist before wiring)
- Task 6.3 depends on 2.4 (API must be deployed before client can call it)
- Task 6.8 depends on 6.1, 6.3, 6.5, 6.6 (all components must exist before integration)
- Task 7.1 depends on 4.5, 6.3 (history API and client must exist)
- Task 8.1 depends on 5.1 (complete backend must exist before deployment)
- Task 8.2 depends on 8.1, 6.8 (backend deployed, frontend complete)
- Task 8.3 depends on 8.2 (frontend must be configured before E2E testing)
- Task 9.1-9.7 depend on 8.3 (core functionality must work before polish)

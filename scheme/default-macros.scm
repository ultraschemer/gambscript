;;; Javascript statement
(define-macro (!s . params) `(##inline-host-statement ,@params))

;;; Javascript expression
(define-macro (!e . params) `(##inline-host-expression ,@params))

;;; javascript expression
(define-macro (!x . params) `(##inline-host-expression ,@params))

;;; Statement Apply (used to call functions as statements in a more Schemey way)
(define-macro (!sa name . args)
  (let 
      ((r (lambda (params) 
            (let ((sz (length params)))
              (let loop ((i 0) (res "") (initializer ""))
		            (if (= i sz) 
                    res
                    (loop (+ i 1) 
                          (string-append 
                           res
                           initializer 
                           "g_scm2host(@" 
                           (number->string (+ i 1)) 
                           "@)")
                          ",")))))))
    (if (symbol? name) 
	    `(##inline-host-statement 
          ,(string-append (symbol->string name) "(" (r args) ");") 
          ,@args)
	    `(##inline-host-statement 
          ,(string-append name "(" (r args) ");") 
          ,@args))))

;;; Expression Apply (used to call javascript functions as expressions in a more Schemey way)
(define-macro (!ea name . args)
  (let 
      ((r (lambda (params) 
            (let ((sz (length params)))
              (let loop ((i 0) (res "") (initializer ""))
		            (if (= i sz) 
                    res
                    (loop (+ i 1) 
                          (string-append 
                           res
                           initializer 
                           "g_scm2host(@" 
                           (number->string (+ i 1)) 
                           "@)")
                          ",")))))))

    (if (symbol? name) 
	    `(##inline-host-expression 
          ,(string-append (symbol->string name) "(" (r args) ")") 
          ,@args)
	    `(##inline-host-expression 
          ,(string-append name "(" (r args) ")") 
          ,@args))))

;;; Expression Apply (used to call functions as expressions in a more Schemey way)
(define-macro (!xa name . args)
  `(!ea ,name ,args))

;;; Import macro:
(define-macro (!js-require name library)
  (let ((l (if (##symbol? library) (symbol->string library) library))
        (n (if (##symbol? name) (symbol->string name) name)))
    `(##inline-host-statement ,(string-append "/***GAMBSCRIPT-REQUIRE***/const " n " = require(\"" l "\");/***GAMBSCRIPT-REQUIRE***/"))))

;;; Object call macros:
(define-macro (!js-expression-call object method . args)
  (let 
      ((r (lambda (params) 
            (let ((sz (length params)))
              (let loop ((i 0) (res "") (initializer ""))
		            (if (= i sz) 
                    res
                    (loop (+ i 1) 
                          (string-append 
                           res
                           initializer 
                           "g_scm2host(@" 
                           (number->string (+ i 3)) 
                           "@)")
                          ",")))))))

  `(##inline-host-expression 
      ,(string-append "g_host2scm(@1@[g_scm2host(@2@)](" (r args) "))") 
      ,object 
      ,(if (symbol? method) (symbol->string method) method) 
      ,@args)))

    
(define-macro (!js-e-call object method . args)
  `(!js-expression-call ,object ,method ,@args))

(define-macro (!js-x-call object method . args)
  `(!js-expression-call ,object ,method ,@args))

(define-macro (!js-call object method . args)
  `(!js-expression-call ,object ,method ,@args))

(define-macro (!call object method . args)
  `(!js-expression-call ,object ,method ,@args))

(define-macro (!! object method . args)
  `(!js-expression-call ,object ,method ,@args))

(define-macro (!js-expression-raw-call object method . args)
  (let 
      ((r (lambda (params) 
            (let ((sz (length params)))
              (let loop ((i 0) (res "") (initializer ""))
		            (if (= i sz) 
                    res
                    (loop (+ i 1) 
                          (string-append 
                           res
                           initializer 
                           "g_scm2host(@" 
                           (number->string (+ i 3)) 
                           "@)")
                          ",")))))))

  `(##inline-host-expression 
      ,(string-append "@1@[g_scm2host(@2@)](" (r args) ")") 
      ,object 
      ,(if (symbol? method) (symbol->string method) method) 
      ,@args)))

    
(define-macro (!js-e-rcall object method . args)
  `(!js-expression-raw-call ,object ,method ,@args))

(define-macro (!js-x-rcall object method . args)
  `(!js-expression-raw-call ,object ,method ,@args))

(define-macro (!js-rcall object method . args)
  `(!js-expression-raw-call ,object ,method ,@args))

(define-macro (!rcall object method . args)
  `(!js-expression-raw-call ,object ,method ,@args))

(define-macro (!!r object method . args)
  `(!js-expression-raw-call ,object ,method ,@args))

(define-macro (!js-statement-call object method . args)
  (let 
      ((r (lambda (params) 
            (let ((sz (length params)))
              (let loop ((i 0) (res "") (initializer ""))
		            (if (= i sz) 
                    res
                    (loop (+ i 1) 
                          (string-append 
                           res
                           initializer 
                           "g_scm2host(@" 
                           (number->string (+ i 3)) 
                           "@)")
                          ",")))))))

  `(##inline-host-statement 
      ,(string-append "@1@[g_scm2host(@2@)](" (r args) ");") 
      ,object 
      ,(if (symbol? method) (symbol->string method) method) 
      ,@args))

(define-macro (!js-s-call object method . args)
  `(!js-statement-call ,object ,method ,@args)

(define-macro (!s-call object method . args)
  `(!js-statement-call ,object ,method ,@args)
  
(define-macro (!scall object method . args)
  `(!js-statement-call ,object ,method ,@args)

(define-macro (!!! object method . args)
  `(!js-statement-call ,object ,method ,@args)
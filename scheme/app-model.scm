;;; Gambit Scheme required bidings for Gambscript:
(declare (standard-bindings) (extended-bindings) (not safe))

;;; Common Gambit scheme includes - the default-macros.scm include must come
;;; before everything:
(##include "***DEFAULT-MACROS-PATH***")

;;; Javascript imports - please, don't duplicate names, this will cause 
;;; your script to be invalid, and the project as a whole couldn't compile:
;;;
;;; (!js-require _ underscore)
;;;
;;; To import underscore, add it to your project, using npm or yarn,
;;; then uncomment the line above.


;;; This is a common Javascript object, just to be set exportable:
(define EXPORT-OBJECT (!js-object))

;;; This function is exported as the entry point of your module.
;;; Use it in Javascript as:
;;; 
;;; import {application} from 'module-name'
;;;
;;; or
;;; 
;;; const application = require('module-name').application
;;; 
;;; where <module-name> is your module name, which is equal to the
;;; directory this script is placed. Remember the full directory path
;;; you transpiled this project. Inside this directory there is an
;;; index.js file, which is your project compiled. Following Webpack
;;; import rules, you don't need to import the index.js file directly.
;;; Just import the directory, which is your module.
;;;
;;; Replace "application" by any name you want, since it is a valid
;;; Javascript identifier. Otherwise, the export will be invalid
(!set! EXPORT-OBJECT 'application (lambda () 
				    (println "Application entry point.")))

;;; This is just an example of how to export a object.
;;;
;;; Replace "variable" by any name you want, since it is a valid
;;; Javascript identifier.
(!set! EXPORT-OBJECT 'variable 10)

;;; Export the object here, just turning this script into a Webpack Module:
(!js-export EXPORT-OBJECT)
